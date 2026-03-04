package com.lms.loanmanagementsystem.service;

import com.lms.loanmanagementsystem.dto.PaymentRequest;
import com.lms.loanmanagementsystem.dto.RepaymentScheduleItem;
import com.lms.loanmanagementsystem.dto.ForeclosureQuoteResponse;
import com.lms.loanmanagementsystem.dto.ForeclosurePaymentRequest;
import com.lms.loanmanagementsystem.dto.ForeclosurePaymentResponse;
import com.lms.loanmanagementsystem.model.*;
import com.lms.loanmanagementsystem.repository.*;
import com.stripe.model.PaymentIntent;
import lombok.RequiredArgsConstructor;
import org.bson.types.ObjectId;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.ReentrantLock;

import static org.springframework.http.HttpStatus.*;

@Service
@RequiredArgsConstructor
public class PaymentService {

    public record EmiEligibility(boolean eligible, String message) {}
    private static final String PAYMENT_STATUS_SUCCESS = "SUCCESS";
    private static final String PAYMENT_STATUS_FAILED = "FAILED";
    private static final String PAYMENT_STATUS_PENDING = "PENDING";
    private static final String EMI_REMARK = "EMI Payment";
    private static final ConcurrentHashMap<String, ReentrantLock> LOAN_SCHEDULE_LOCKS = new ConcurrentHashMap<>();
    private static final ConcurrentHashMap<String, ReentrantLock> PREPAYMENT_REQUEST_LOCKS = new ConcurrentHashMap<>();

    @Value("${payments.pending-timeout-seconds:30}")
    private long pendingTimeoutSeconds;

    private final PaymentRepository paymentRepository;
    private final LoanApplicationRepository loanApplicationRepository;
    private final RepaymentScheduleRepository repaymentScheduleRepository;
    private final TransactionLedgerRepository transactionLedgerRepository;
    private final PrepaymentRequestRepository prepaymentRequestRepository;
    private final ForeclosureRequestService foreclosureRequestService;
    private final UserRepository userRepository;
    private final LoanTypeRepository loanTypeRepository;
    private final StripePaymentService stripePaymentService;

    public String payInstallment(
            PaymentRequest request,
            String userId,
            String idempotencyKey
    ) {

        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            throw new ResponseStatusException(BAD_REQUEST, "Idempotency-Key header is required");
        }

        if (request == null || request.getApplicationId() == null ||
                !ObjectId.isValid(request.getApplicationId())) {
            throw new ResponseStatusException(BAD_REQUEST, "Invalid applicationId");
        }

        if (request.getInstallmentNo() == null || request.getInstallmentNo() <= 0) {
            throw new ResponseStatusException(BAD_REQUEST, "Invalid installment number");
        }

        if (request.getAmount() == null || request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new ResponseStatusException(BAD_REQUEST, "Invalid amount");
        }

        // Idempotency guard
        Payment existingPayment = paymentRepository.findByIdempotencyKey(idempotencyKey).orElse(null);
        if (existingPayment != null && PAYMENT_STATUS_SUCCESS.equalsIgnoreCase(existingPayment.getStatus())) {
            throw new ResponseStatusException(CONFLICT, "Duplicate payment request");
        }

        LoanApplication loan = loanApplicationRepository.findById(request.getApplicationId())
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Loan not found"));

        if (!loan.getUserId().equals(userId)) {
            throw new ResponseStatusException(FORBIDDEN, "Unauthorized access");
        }

        if (loan.getStatus() == LoanStatus.CLOSED) {
            throw new ResponseStatusException(BAD_REQUEST, "Loan is already closed");
        }

        if (loan.getStatus() != LoanStatus.DISBURSED) {
            throw new ResponseStatusException(BAD_REQUEST, "Payments are allowed only after DISBURSED");
        }

        RepaymentScheduleDoc activeSchedule = repaymentScheduleRepository
                .findByLoanApplicationIdAndStatus(loan.getId(), "ACTIVE")
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Active schedule not found"));

        List<RepaymentScheduleItem> items = activeSchedule.getItems();
        if (items == null || items.isEmpty()) {
            throw new ResponseStatusException(NOT_FOUND, "Schedule items not found");
        }

        RepaymentScheduleItem installment = items.stream()
                .filter(i -> request.getInstallmentNo().equals(i.getInstallmentNo()))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Installment not found"));
        BigDecimal scheduledInstallmentAmount = nz(installment.getAmount());

        if ("paid".equalsIgnoreCase(installment.getStatus())) {
            throw new ResponseStatusException(CONFLICT, "Installment already paid");
        }

        PrepaymentRequest approvedPrepaymentForInstallment = getApprovedPrepaymentForCurrentInstallment(
                userId,
                loan.getId(),
                request.getInstallmentNo(),
                items
        );

        ReentrantLock prepaymentLock = null;
        if (approvedPrepaymentForInstallment != null) {
            prepaymentLock = acquirePrepaymentRequestLock(approvedPrepaymentForInstallment.getId());
            PrepaymentRequest latestPrepayment = prepaymentRequestRepository
                    .findById(approvedPrepaymentForInstallment.getId())
                    .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Prepayment request not found"));

            if (latestPrepayment.getStatus() != PrepaymentRequestStatus.APPROVED) {
                throw new ResponseStatusException(BAD_REQUEST, "Prepayment request is not approved");
            }
            if (Boolean.TRUE.equals(latestPrepayment.getConsumed())) {
                throw new ResponseStatusException(CONFLICT, "Prepayment already consumed");
            }
            approvedPrepaymentForInstallment = latestPrepayment;
        }

        try {
            BigDecimal expectedAmount = approvedPrepaymentForInstallment != null
                    ? nz(approvedPrepaymentForInstallment.getRequestedAmount())
                    : nz(installment.getAmount());

            if (request.getAmount().compareTo(expectedAmount) != 0) {
                throw new ResponseStatusException(
                        BAD_REQUEST,
                        "Amount must match payable amount: " + expectedAmount
                );
            }
            boolean useWallet = Boolean.TRUE.equals(request.getUseWallet());
            BigDecimal walletDebit = BigDecimal.ZERO;
            BigDecimal walletCredit = BigDecimal.ZERO;
            User user = null;
            BigDecimal availableWalletBalance = BigDecimal.ZERO;

            if (useWallet) {
                user = userRepository.findById(userId)
                        .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "User not found"));
                availableWalletBalance = nz(user.getWalletBalance());
                if (availableWalletBalance.compareTo(request.getAmount()) < 0) {
                    throw new ResponseStatusException(BAD_REQUEST, "Insufficient wallet balance");
                }
                walletDebit = request.getAmount();
            } else {
                verifyStripePaymentIntent(request, userId, loan.getId(), expectedAmount);
            }

            // Extra duplicate guard: already recorded success for same installment
            if (paymentRepository.existsByApplicationIdAndInstallmentNoAndStatus(
                    loan.getId(), request.getInstallmentNo(), PAYMENT_STATUS_SUCCESS)) {
                throw new ResponseStatusException(CONFLICT, "Payment already recorded for this installment");
            }

            LocalDateTime now = LocalDateTime.now();
            if (approvedPrepaymentForInstallment == null && hasSuccessfulEmiPaymentInCurrentMonth(loan.getId(), userId, now)) {
                throw new ResponseStatusException(CONFLICT, "EMI payment already done for this month");
            }

            // Save payment receipt
            Payment payment = existingPayment == null ? new Payment() : existingPayment;
            payment.setApplicationId(loan.getId());
            payment.setUserId(userId);
            payment.setInstallmentNo(request.getInstallmentNo());
            payment.setAmount(request.getAmount());
            payment.setPaymentDate(now);
            payment.setStatus(PAYMENT_STATUS_SUCCESS);
            payment.setIdempotencyKey(idempotencyKey);
            payment.setRemarks(EMI_REMARK);

            Payment savedPayment = paymentRepository.save(payment);
            BigDecimal outstandingPrincipalBefore = getOutstandingPrincipal(loan);
            BigDecimal appliedInstallmentAmount = expectedAmount;
            BigDecimal scheduledInterest = nz(installment.getInterestAmount());
            BigDecimal principalComponent = appliedInstallmentAmount.subtract(scheduledInterest);
            if (principalComponent.compareTo(BigDecimal.ZERO) < 0) {
                principalComponent = BigDecimal.ZERO;
            }
            if (principalComponent.compareTo(outstandingPrincipalBefore) > 0) {
                principalComponent = outstandingPrincipalBefore;
            }
            BigDecimal interestComponent = appliedInstallmentAmount.subtract(principalComponent);
            if (interestComponent.compareTo(BigDecimal.ZERO) < 0) {
                interestComponent = BigDecimal.ZERO;
            }

            TransactionLedger emiLedger = TransactionLedger.builder()
                .loanId(loan.getId())
                .transactionType(TransactionType.EMI_PAYMENT)
                .amount(appliedInstallmentAmount)
                .timestamp(now)
                .installmentNo(request.getInstallmentNo())
                .principalComponent(principalComponent)
                .interestComponent(interestComponent)
                .penaltyComponent(BigDecimal.ZERO)
                .paymentId(savedPayment.getId())
                .remarks("EMI payment for installment " + request.getInstallmentNo())
                .build();

            transactionLedgerRepository.save(emiLedger);

            // Mark installment paid
            BigDecimal outstandingPrincipalAfterPayment = getOutstandingPrincipal(loan);
            installment.setAmount(appliedInstallmentAmount);
            installment.setTotalPayment(appliedInstallmentAmount);
            installment.setPrincipalAmount(principalComponent);
            installment.setInterestAmount(interestComponent);
            installment.setBalanceAmount(outstandingPrincipalAfterPayment);
            installment.setStatus("paid");

            boolean shouldReschedule = appliedInstallmentAmount.compareTo(scheduledInstallmentAmount) != 0;
            if (approvedPrepaymentForInstallment != null) {
                approvedPrepaymentForInstallment.setConsumed(true);
                approvedPrepaymentForInstallment.setConsumedAt(now);
                approvedPrepaymentForInstallment.setConsumedByPaymentId(savedPayment.getId());
                prepaymentRequestRepository.save(approvedPrepaymentForInstallment);
                shouldReschedule = true;
            }

            if (approvedPrepaymentForInstallment != null) {
                // Keep history: close current ACTIVE schedule and create a new ACTIVE version (v2+)
                activeSchedule.setStatus("CLOSED");
                repaymentScheduleRepository.save(activeSchedule);
                saveRescheduledVersionWithLock(
                        loan,
                        activeSchedule,
                        approvedPrepaymentForInstallment,
                        now
                );
            } else {
                if (shouldReschedule) {
                    recalculateRemainingScheduleAfterPrepayment(loan, activeSchedule);
                }
                repaymentScheduleRepository.save(activeSchedule);
            }

            if (walletDebit.compareTo(BigDecimal.ZERO) > 0 || walletCredit.compareTo(BigDecimal.ZERO) > 0) {
                if (user == null) {
                    user = userRepository.findById(userId)
                            .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "User not found"));
                    availableWalletBalance = nz(user.getWalletBalance());
                }
                BigDecimal updatedWalletBalance = availableWalletBalance
                        .subtract(walletDebit)
                        .add(walletCredit)
                        .setScale(2, RoundingMode.HALF_UP);
                user.setWalletBalance(updatedWalletBalance);
                userRepository.save(user);
            }

            // Auto-close loan if all installments are paid in ACTIVE schedule and principal is cleared
            boolean allPaid = activeSchedule.getItems().stream()
                    .allMatch(it -> it.getStatus() != null && "paid".equalsIgnoreCase(it.getStatus()));

            if (allPaid && getOutstandingPrincipal(loan).compareTo(BigDecimal.ZERO) == 0) {
                loan.setStatus(LoanStatus.CLOSED);
                loanApplicationRepository.save(loan);

                activeSchedule.setStatus("CLOSED");
                repaymentScheduleRepository.save(activeSchedule);
            }

            return "Payment Successful";
        } finally {
            if (prepaymentLock != null) {
                prepaymentLock.unlock();
            }
        }
    }

    public EmiEligibility getEmiEligibility(String applicationId, String userId) {
        if (applicationId == null || !ObjectId.isValid(applicationId)) {
            throw new ResponseStatusException(BAD_REQUEST, "Invalid applicationId");
        }

        LoanApplication loan = loanApplicationRepository.findById(applicationId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Loan not found"));

        if (!loan.getUserId().equals(userId)) {
            throw new ResponseStatusException(FORBIDDEN, "Unauthorized access");
        }

        if (loan.getStatus() == LoanStatus.CLOSED) {
            return new EmiEligibility(false, "Loan is already closed");
        }

        if (loan.getStatus() != LoanStatus.DISBURSED) {
            return new EmiEligibility(false, "Payments are allowed only after DISBURSED");
        }

        RepaymentScheduleDoc activeSchedule = repaymentScheduleRepository
                .findByLoanApplicationIdAndStatus(loan.getId(), "ACTIVE")
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Active schedule not found"));

        List<RepaymentScheduleItem> items = activeSchedule.getItems();
        if (items == null || items.isEmpty()) {
            return new EmiEligibility(false, "Schedule items not found");
        }

        Integer nextUnpaidInstallmentNo = items.stream()
                .filter(i -> i.getStatus() == null || !"paid".equalsIgnoreCase(i.getStatus()))
                .map(RepaymentScheduleItem::getInstallmentNo)
                .filter(no -> no != null)
                .min(Integer::compareTo)
                .orElse(null);

        PrepaymentRequest approvedPrepaymentForInstallment = nextUnpaidInstallmentNo == null
                ? null
                : getApprovedPrepaymentForCurrentInstallment(
                userId,
                loan.getId(),
                nextUnpaidInstallmentNo,
                items
        );

        boolean alreadyPaidThisMonth = hasSuccessfulEmiPaymentInCurrentMonth(
                loan.getId(),
                userId,
                LocalDateTime.now()
        );
        if (alreadyPaidThisMonth && approvedPrepaymentForInstallment == null) {
            return new EmiEligibility(false, "EMI payment already done for this month");
        }

        if (alreadyPaidThisMonth) {
            return new EmiEligibility(true, "Admin-approved prepayment available for this month");
        }

        return new EmiEligibility(true, "Eligible for EMI payment");
    }

    public ForeclosureQuoteResponse getForeclosureQuote(String applicationId, String userId) {
        if (applicationId == null || !ObjectId.isValid(applicationId)) {
            throw new ResponseStatusException(BAD_REQUEST, "Invalid applicationId");
        }

        LoanApplication loan = loanApplicationRepository.findById(applicationId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Loan not found"));

        if (!loan.getUserId().equals(userId)) {
            throw new ResponseStatusException(FORBIDDEN, "Unauthorized access");
        }
        if (loan.getStatus() == LoanStatus.CLOSED) {
            throw new ResponseStatusException(BAD_REQUEST, "Loan is already closed");
        }
        if (!(loan.getStatus() == LoanStatus.DISBURSED || loan.getStatus() == LoanStatus.ACTIVE)) {
            throw new ResponseStatusException(BAD_REQUEST, "Foreclosure is allowed only after DISBURSED");
        }

        RepaymentScheduleDoc activeSchedule = repaymentScheduleRepository
                .findByLoanApplicationIdAndStatus(loan.getId(), "ACTIVE")
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Active schedule not found"));

        BigDecimal remainingPayable = getRemainingLoanPayable(activeSchedule.getItems()).setScale(2, RoundingMode.HALF_UP);
        BigDecimal outstandingPrincipal = getOutstandingPrincipal(loan).setScale(2, RoundingMode.HALF_UP);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "User not found"));
        BigDecimal walletBalance = nz(user.getWalletBalance()).setScale(2, RoundingMode.HALF_UP);
        BigDecimal payableAfterWallet = remainingPayable.subtract(walletBalance);
        if (payableAfterWallet.compareTo(BigDecimal.ZERO) < 0) {
            payableAfterWallet = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }

        return new ForeclosureQuoteResponse(
                loan.getId(),
                remainingPayable,
                outstandingPrincipal,
                walletBalance,
                payableAfterWallet
        );
    }

    public ForeclosurePaymentResponse payForeclosure(
            ForeclosurePaymentRequest request,
            String userId,
            String idempotencyKey
    ) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            throw new ResponseStatusException(BAD_REQUEST, "Idempotency-Key header is required");
        }
        if (request == null || request.getApplicationId() == null || !ObjectId.isValid(request.getApplicationId())) {
            throw new ResponseStatusException(BAD_REQUEST, "Invalid applicationId");
        }
        if (request.getAmount() == null || request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new ResponseStatusException(BAD_REQUEST, "Invalid amount");
        }

        Payment existingPayment = paymentRepository.findByIdempotencyKey(idempotencyKey).orElse(null);
        if (existingPayment != null && PAYMENT_STATUS_SUCCESS.equalsIgnoreCase(existingPayment.getStatus())) {
            throw new ResponseStatusException(CONFLICT, "Duplicate payment request");
        }

        LoanApplication loan = loanApplicationRepository.findById(request.getApplicationId())
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Loan not found"));
        if (!loan.getUserId().equals(userId)) {
            throw new ResponseStatusException(FORBIDDEN, "Unauthorized access");
        }
        if (loan.getStatus() == LoanStatus.CLOSED) {
            throw new ResponseStatusException(BAD_REQUEST, "Loan is already closed");
        }
        if (!(loan.getStatus() == LoanStatus.DISBURSED || loan.getStatus() == LoanStatus.ACTIVE)) {
            throw new ResponseStatusException(BAD_REQUEST, "Foreclosure is allowed only after DISBURSED");
        }
        ForeclosureRequest approvedRequest = foreclosureRequestService.getApprovedUnconsumedRequest(userId, loan.getId());
        if (approvedRequest == null) {
            throw new ResponseStatusException(BAD_REQUEST, "An approved foreclosure request is required");
        }

        RepaymentScheduleDoc activeSchedule = repaymentScheduleRepository
                .findByLoanApplicationIdAndStatus(loan.getId(), "ACTIVE")
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Active schedule not found"));

        List<RepaymentScheduleItem> items = activeSchedule.getItems();
        BigDecimal remainingPayable = getRemainingLoanPayable(items).setScale(2, RoundingMode.HALF_UP);
        if (remainingPayable.compareTo(BigDecimal.ZERO) <= 0) {
            throw new ResponseStatusException(BAD_REQUEST, "No outstanding payable amount for foreclosure");
        }
        if (request.getAmount().compareTo(remainingPayable) < 0) {
            throw new ResponseStatusException(BAD_REQUEST, "Amount must be at least foreclosure payable amount: " + remainingPayable);
        }

        boolean useWallet = Boolean.TRUE.equals(request.getUseWallet());
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "User not found"));
        BigDecimal walletBalance = nz(user.getWalletBalance()).setScale(2, RoundingMode.HALF_UP);
        BigDecimal walletDebit = BigDecimal.ZERO;
        BigDecimal walletCredit = request.getAmount().subtract(remainingPayable).setScale(2, RoundingMode.HALF_UP);

        if (useWallet) {
            if (walletBalance.compareTo(request.getAmount()) < 0) {
                throw new ResponseStatusException(BAD_REQUEST, "Insufficient wallet balance");
            }
            walletDebit = request.getAmount().setScale(2, RoundingMode.HALF_UP);
        }

        LocalDateTime now = LocalDateTime.now();
        Payment payment = existingPayment == null ? new Payment() : existingPayment;
        payment.setApplicationId(loan.getId());
        payment.setUserId(userId);
        payment.setInstallmentNo(null);
        payment.setAmount(request.getAmount().setScale(2, RoundingMode.HALF_UP));
        payment.setPaymentDate(now);
        payment.setStatus(PAYMENT_STATUS_SUCCESS);
        payment.setIdempotencyKey(idempotencyKey);
        payment.setRemarks("FORECLOSURE");
        Payment savedPayment = paymentRepository.save(payment);
        foreclosureRequestService.markConsumed(approvedRequest, savedPayment.getId());

        BigDecimal outstandingPrincipal = getOutstandingPrincipal(loan).setScale(2, RoundingMode.HALF_UP);
        BigDecimal principalComponent = outstandingPrincipal.compareTo(remainingPayable) > 0
                ? remainingPayable
                : outstandingPrincipal;
        BigDecimal interestComponent = remainingPayable.subtract(principalComponent).setScale(2, RoundingMode.HALF_UP);

        TransactionLedger ledger = TransactionLedger.builder()
                .loanId(loan.getId())
                .transactionType(TransactionType.PREPAYMENT)
                .amount(remainingPayable)
                .timestamp(now)
                .installmentNo(null)
                .principalComponent(principalComponent)
                .interestComponent(interestComponent)
                .penaltyComponent(BigDecimal.ZERO)
                .paymentId(savedPayment.getId())
                .remarks("Foreclosure payment")
                .build();
        transactionLedgerRepository.save(ledger);

        if (items != null) {
            for (RepaymentScheduleItem item : items) {
                if (item.getStatus() == null || !"paid".equalsIgnoreCase(item.getStatus())) {
                    item.setStatus("paid");
                    item.setBalanceAmount(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
                }
            }
        }
        activeSchedule.setStatus("CLOSED");
        repaymentScheduleRepository.save(activeSchedule);

        loan.setStatus(LoanStatus.CLOSED);
        loanApplicationRepository.save(loan);

        BigDecimal walletBalanceAfter = walletBalance
                .subtract(walletDebit)
                .add(walletCredit)
                .setScale(2, RoundingMode.HALF_UP);
        user.setWalletBalance(walletBalanceAfter);
        userRepository.save(user);

        return new ForeclosurePaymentResponse(
                "Foreclosure Successful",
                loan.getId(),
                request.getAmount().setScale(2, RoundingMode.HALF_UP),
                remainingPayable,
                walletDebit,
                walletCredit,
                walletBalanceAfter,
                loan.getStatus()
        );
    }

    public void createPendingEmiCheckoutPayment(
            String applicationId,
            Integer installmentNo,
            BigDecimal amount,
            String userId,
            String checkoutSessionId
    ) {
        if (applicationId == null || !ObjectId.isValid(applicationId)) {
            throw new ResponseStatusException(BAD_REQUEST, "Invalid applicationId");
        }
        if (installmentNo == null || installmentNo <= 0) {
            throw new ResponseStatusException(BAD_REQUEST, "Invalid installment number");
        }
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new ResponseStatusException(BAD_REQUEST, "Invalid amount");
        }
        if (checkoutSessionId == null || checkoutSessionId.isBlank()) {
            throw new ResponseStatusException(BAD_REQUEST, "Invalid checkout session id");
        }

        LoanApplication loan = loanApplicationRepository.findById(applicationId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Loan not found"));
        if (!loan.getUserId().equals(userId)) {
            throw new ResponseStatusException(FORBIDDEN, "Unauthorized access");
        }

        String idempotencyKey = "stripe-checkout-" + checkoutSessionId;
        Payment existing = paymentRepository.findByIdempotencyKey(idempotencyKey).orElse(null);
        if (existing != null) {
            if (PAYMENT_STATUS_SUCCESS.equalsIgnoreCase(existing.getStatus())) {
                return;
            }
            existing.setStatus(PAYMENT_STATUS_PENDING);
            existing.setPaymentDate(LocalDateTime.now());
            existing.setApplicationId(applicationId);
            existing.setUserId(userId);
            existing.setInstallmentNo(installmentNo);
            existing.setAmount(amount);
            existing.setRemarks(EMI_REMARK);
            paymentRepository.save(existing);
            return;
        }

        Payment payment = new Payment();
        payment.setApplicationId(applicationId);
        payment.setUserId(userId);
        payment.setInstallmentNo(installmentNo);
        payment.setAmount(amount);
        payment.setPaymentDate(LocalDateTime.now());
        payment.setStatus(PAYMENT_STATUS_PENDING);
        payment.setIdempotencyKey(idempotencyKey);
        payment.setRemarks(EMI_REMARK);
        paymentRepository.save(payment);
    }

    public void markStripeCheckoutFailed(String checkoutSessionId, String userId, String reason) {
        if (checkoutSessionId == null || checkoutSessionId.isBlank()) return;
        String idempotencyKey = "stripe-checkout-" + checkoutSessionId;

        Payment payment = paymentRepository.findByIdempotencyKeyAndUserId(idempotencyKey, userId).orElse(null);
        if (payment == null) {
            return;
        }
        if (PAYMENT_STATUS_SUCCESS.equalsIgnoreCase(payment.getStatus())) {
            return;
        }

        payment.setStatus(PAYMENT_STATUS_FAILED);
        payment.setPaymentDate(LocalDateTime.now());
        String failureReason = mapFailureReason(reason);
        payment.setRemarks(EMI_REMARK + " - " + failureReason);
        paymentRepository.save(payment);
    }

    private String mapFailureReason(String reason) {
        if (reason == null || reason.isBlank()) {
            return "Checkout failed";
        }
        String normalized = reason.trim().toUpperCase();
        if ("USER_CANCELLED".equals(normalized)) {
            return "User cancelled";
        }
        if ("TIMEOUT".equals(normalized)) {
            return "Timed out after " + Math.max(1, pendingTimeoutSeconds) + " second(s)";
        }
        if ("FINALIZE_FAILED".equals(normalized)) {
            return "Finalize failed";
        }
        return reason;
    }

    /**
     * Separate prepayment payment.
     * User pays exactly the approved requestedAmount (not added to EMI).
     * This will CLOSE current schedule and create a new ACTIVE version.
     */
    public String payApprovedPrepayment(
            String prepaymentRequestId,
            String userId,
            BigDecimal amount,
            String idempotencyKey
    ) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            throw new ResponseStatusException(BAD_REQUEST, "Idempotency-Key header is required");
        }

        if (prepaymentRequestId == null || !ObjectId.isValid(prepaymentRequestId)) {
            throw new ResponseStatusException(BAD_REQUEST, "Invalid prepayment request id");
        }

        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new ResponseStatusException(BAD_REQUEST, "Invalid amount");
        }

        paymentRepository.findByIdempotencyKey(idempotencyKey)
                .ifPresent(existing -> {
                    if ("SUCCESS".equalsIgnoreCase(existing.getStatus())) {
                        throw new ResponseStatusException(CONFLICT, "Duplicate payment request");
                    }
                });
        ReentrantLock prepaymentLock = acquirePrepaymentRequestLock(prepaymentRequestId);
        try {
            PrepaymentRequest prepay = prepaymentRequestRepository.findById(prepaymentRequestId)
                    .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Prepayment request not found"));

            if (!userId.equals(prepay.getUserId())) {
                throw new ResponseStatusException(FORBIDDEN, "Unauthorized access");
            }

            if (prepay.getStatus() != PrepaymentRequestStatus.APPROVED) {
                throw new ResponseStatusException(BAD_REQUEST, "Prepayment request is not approved");
            }

            if (Boolean.TRUE.equals(prepay.getConsumed())) {
                throw new ResponseStatusException(CONFLICT, "Prepayment already consumed");
            }

            BigDecimal approvedAmount = nz(prepay.getRequestedAmount());
            if (amount.compareTo(approvedAmount) != 0) {
                throw new ResponseStatusException(
                        BAD_REQUEST,
                        "Amount must match approved prepayment amount: " + approvedAmount
                );
            }

            LoanApplication loan = loanApplicationRepository.findById(prepay.getLoanApplicationId())
                    .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Loan not found"));

            if (loan.getStatus() == LoanStatus.CLOSED) {
                throw new ResponseStatusException(BAD_REQUEST, "Loan is already closed");
            }

            if (loan.getStatus() != LoanStatus.DISBURSED) {
                throw new ResponseStatusException(BAD_REQUEST, "Prepayment is allowed only after DISBURSED");
            }

            RepaymentScheduleDoc activeSchedule = repaymentScheduleRepository
                    .findByLoanApplicationIdAndStatus(loan.getId(), "ACTIVE")
                    .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Active schedule not found"));

            LocalDateTime now = LocalDateTime.now();

            // Save payment receipt
            Payment payment = new Payment();
            payment.setApplicationId(loan.getId());
            payment.setUserId(userId);
            payment.setInstallmentNo(null);
            payment.setAmount(amount);
            payment.setPaymentDate(now);
            payment.setStatus("SUCCESS");
            payment.setIdempotencyKey(idempotencyKey);
            payment.setRemarks("PREPAYMENT");

            Payment savedPayment = paymentRepository.save(payment);

            // Ledger entry for PREPAYMENT (principal-only)
            TransactionLedger prepayLedger = TransactionLedger.builder()
                    .loanId(loan.getId())
                    .transactionType(TransactionType.PREPAYMENT)
                    .amount(amount)
                    .timestamp(now)
                    .installmentNo(null)
                    .principalComponent(amount)
                    .interestComponent(BigDecimal.ZERO)
                    .penaltyComponent(BigDecimal.ZERO)
                    .paymentId(savedPayment.getId())
                    .remarks("Prepayment paid (requestId=" + prepaymentRequestId + ")")
                    .build();

            transactionLedgerRepository.save(prepayLedger);

            // Consume prepayment request
            prepay.setConsumed(true);
            prepay.setConsumedAt(now);
            prepay.setConsumedByPaymentId(savedPayment.getId());
            prepaymentRequestRepository.save(prepay);

            // Close current schedule and create next ACTIVE version
            activeSchedule.setStatus("CLOSED");
            repaymentScheduleRepository.save(activeSchedule);
            RepaymentScheduleDoc savedV2 = saveRescheduledVersionWithLock(loan, activeSchedule, prepay, now);

            // Auto-close if principal cleared
            if (getOutstandingPrincipal(loan).compareTo(BigDecimal.ZERO) == 0) {
                loan.setStatus(LoanStatus.CLOSED);
                loanApplicationRepository.save(loan);

                savedV2.setStatus("CLOSED");
                repaymentScheduleRepository.save(savedV2);
            }

            return "Prepayment Successful";
        } finally {
            prepaymentLock.unlock();
        }
    }

    private RepaymentScheduleDoc createRescheduledVersion(
            LoanApplication loan,
            RepaymentScheduleDoc oldSchedule,
            PrepaymentRequest prepay,
            LocalDateTime now
    ) {
        int nextVersion = repaymentScheduleRepository
                .findTopByLoanApplicationIdOrderByVersionDesc(loan.getId())
                .map(s -> s.getVersion() == null ? 2 : s.getVersion() + 1)
                .orElse(2);

        List<RepaymentScheduleItem> copied = deepCopyItems(oldSchedule.getItems());

        // Recalculate only unpaid items based on new outstanding principal
        recalcUnpaidItemsInPlace(loan, copied);

        String createdBy = "SYSTEM";
        if (prepay != null && prepay.getReviewedBy() != null && !prepay.getReviewedBy().isBlank()) {
            createdBy = prepay.getReviewedBy();
        }

        return RepaymentScheduleDoc.builder()
                .loanApplicationId(loan.getId())
                .version(nextVersion)
                .status("ACTIVE")
                .createdAt(now)
                .createdBy(createdBy)
                .reason("PREPAYMENT")
                .effectiveFrom(now)
                .items(copied)
                .build();
    }

    private ReentrantLock acquireScheduleLock(String loanId) {
        ReentrantLock lock = LOAN_SCHEDULE_LOCKS.computeIfAbsent(loanId, key -> new ReentrantLock());
        lock.lock();
        return lock;
    }

    private RepaymentScheduleDoc saveRescheduledVersionWithLock(
            LoanApplication loan,
            RepaymentScheduleDoc oldSchedule,
            PrepaymentRequest prepay,
            LocalDateTime now
    ) {
        ReentrantLock lock = acquireScheduleLock(loan.getId());
        try {
            repaymentScheduleRepository
                    .findByLoanApplicationIdAndStatus(loan.getId(), "ACTIVE")
                    .ifPresent(existingActive -> {
                        if (oldSchedule == null || existingActive.getId() == null || !existingActive.getId().equals(oldSchedule.getId())) {
                            existingActive.setStatus("CLOSED");
                            repaymentScheduleRepository.save(existingActive);
                        }
                    });
            RepaymentScheduleDoc nextVersion = createRescheduledVersion(loan, oldSchedule, prepay, now);
            return repaymentScheduleRepository.save(nextVersion);
        } finally {
            lock.unlock();
        }
    }

    private ReentrantLock acquirePrepaymentRequestLock(String prepaymentRequestId) {
        ReentrantLock lock = PREPAYMENT_REQUEST_LOCKS.computeIfAbsent(prepaymentRequestId, key -> new ReentrantLock());
        lock.lock();
        return lock;
    }

    private List<RepaymentScheduleItem> deepCopyItems(List<RepaymentScheduleItem> items) {
        List<RepaymentScheduleItem> copy = new ArrayList<>();
        if (items == null) return copy;

        for (RepaymentScheduleItem i : items) {
            RepaymentScheduleItem c = new RepaymentScheduleItem(
                    i.getInstallmentNo(),
                    i.getDueDate(),
                    i.getAmount(),
                    i.getPrincipalAmount(),
                    i.getInterestAmount(),
                    i.getTotalPayment(),
                    i.getBalanceAmount(),
                    i.getStatus()
            );
            copy.add(c);
        }
        return copy;
    }

    private void recalcUnpaidItemsInPlace(LoanApplication loan, List<RepaymentScheduleItem> items) {
        if (items == null || items.isEmpty()) return;

        List<RepaymentScheduleItem> unpaid = items.stream()
                .filter(i -> i.getStatus() == null || !"paid".equalsIgnoreCase(i.getStatus()))
                .sorted(Comparator.comparing(RepaymentScheduleItem::getInstallmentNo))
                .toList();

        if (unpaid.isEmpty()) return;

        BigDecimal outstandingPrincipal = getOutstandingPrincipal(loan);

        if (outstandingPrincipal.compareTo(BigDecimal.ZERO) <= 0) {
            for (RepaymentScheduleItem it : unpaid) {
                it.setAmount(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
                it.setPrincipalAmount(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
                it.setInterestAmount(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
                it.setTotalPayment(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
                it.setBalanceAmount(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
                it.setStatus("paid");
            }
            return;
        }

        LoanType loanType = loanTypeRepository.findById(loan.getLoanTypeId())
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Loan type not found"));

        final MathContext mc = MathContext.DECIMAL64;
        final RoundingMode rm = RoundingMode.HALF_UP;

        int remainingInstallments = unpaid.size();

        BigDecimal monthlyRate = BigDecimal.ZERO;
        if (loanType.getInterestRate() != null && loanType.getInterestRate() > 0) {
            monthlyRate = BigDecimal.valueOf(loanType.getInterestRate())
                    .divide(BigDecimal.valueOf(1200), 12, rm);
        }

        BigDecimal emi;
        if (monthlyRate.compareTo(BigDecimal.ZERO) == 0) {
            emi = outstandingPrincipal.divide(BigDecimal.valueOf(remainingInstallments), 2, rm);
        } else {
            BigDecimal onePlusR = BigDecimal.ONE.add(monthlyRate, mc);
            BigDecimal pow = onePlusR.pow(remainingInstallments, mc);
            BigDecimal numerator = outstandingPrincipal.multiply(monthlyRate, mc).multiply(pow, mc);
            BigDecimal denominator = pow.subtract(BigDecimal.ONE, mc);
            emi = numerator.divide(denominator, 2, rm);
        }

        BigDecimal runningBalance = outstandingPrincipal.setScale(2, rm);
        LocalDate today = LocalDate.now();

        for (int idx = 0; idx < unpaid.size(); idx++) {
            RepaymentScheduleItem it = unpaid.get(idx);

            BigDecimal interest = runningBalance.multiply(monthlyRate, mc).setScale(2, rm);
            BigDecimal principal = emi.subtract(interest).setScale(2, rm);
            BigDecimal total = emi;

            if (idx == unpaid.size() - 1 || principal.compareTo(runningBalance) > 0) {
                principal = runningBalance;
                total = principal.add(interest).setScale(2, rm);
            }

            runningBalance = runningBalance.subtract(principal).setScale(2, rm);
            if (runningBalance.compareTo(BigDecimal.ZERO) < 0) {
                runningBalance = BigDecimal.ZERO.setScale(2, rm);
            }

            it.setAmount(total);
            it.setTotalPayment(total);
            it.setInterestAmount(interest);
            it.setPrincipalAmount(principal);
            it.setBalanceAmount(runningBalance);

            LocalDate due = parseDate(it.getDueDate());
            if (due != null && due.isBefore(today)) {
                it.setStatus("overdue");
            } else {
                it.setStatus("upcoming");
            }
        }
    }

    private BigDecimal getOutstandingPrincipal(LoanApplication loan) {
        BigDecimal disbursed = nz(loan.getDisbursedAmount());
        List<TransactionLedger> txns = transactionLedgerRepository.findByLoanId(loan.getId());

        BigDecimal principalPaid = txns.stream()
                .filter(t -> t.getTransactionType() == TransactionType.EMI_PAYMENT
                        || t.getTransactionType() == TransactionType.PREPAYMENT)
                .map(t -> nz(t.getPrincipalComponent()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal outstanding = disbursed.subtract(principalPaid);
        return outstanding.compareTo(BigDecimal.ZERO) < 0 ? BigDecimal.ZERO : outstanding;
    }

    private LocalDate parseDate(String value) {
        if (value == null || value.isBlank()) return null;
        try { return LocalDate.parse(value); } catch (Exception ex) { return null; }
    }

    private void verifyStripePaymentIntent(
            PaymentRequest request,
            String userId,
            String applicationId,
            BigDecimal expectedAmount
    ) {
        PaymentIntent intent = stripePaymentService.fetchPaymentIntent(request.getPaymentIntentId());

        if (!"succeeded".equalsIgnoreCase(intent.getStatus())) {
            throw new ResponseStatusException(BAD_REQUEST, "Stripe payment is not completed");
        }

        BigDecimal stripeAmount = BigDecimal.valueOf(intent.getAmountReceived())
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        if (stripeAmount.compareTo(expectedAmount.setScale(2, RoundingMode.HALF_UP)) != 0) {
            throw new ResponseStatusException(BAD_REQUEST, "Stripe amount mismatch");
        }

        String metadataApplicationId = intent.getMetadata().get("applicationId");
        String metadataInstallment = intent.getMetadata().get("installmentNo");
        String metadataUserId = intent.getMetadata().get("userId");

        if (!applicationId.equals(metadataApplicationId) ||
                !request.getInstallmentNo().toString().equals(metadataInstallment) ||
                !userId.equals(metadataUserId)) {
            throw new ResponseStatusException(BAD_REQUEST, "Stripe payment metadata mismatch");
        }
    }

    private BigDecimal nz(BigDecimal v) {
        return v == null ? BigDecimal.ZERO : v;
    }

    private BigDecimal getRemainingLoanPayable(List<RepaymentScheduleItem> items) {
        if (items == null || items.isEmpty()) {
            return BigDecimal.ZERO;
        }
        return items.stream()
                .filter(i -> i.getStatus() == null || !"paid".equalsIgnoreCase(i.getStatus()))
                .map(i -> {
                    BigDecimal total = nz(i.getTotalPayment());
                    return total.compareTo(BigDecimal.ZERO) > 0 ? total : nz(i.getAmount());
                })
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private boolean hasSuccessfulEmiPaymentInCurrentMonth(
            String applicationId,
            String userId,
            LocalDateTime now
    ) {
        LocalDateTime monthStart = now.toLocalDate().withDayOfMonth(1).atStartOfDay();
        LocalDateTime monthEndInclusive = monthStart.plusMonths(1).minusNanos(1);
        return paymentRepository.existsByApplicationIdAndUserIdAndStatusAndRemarksAndPaymentDateBetween(
                applicationId,
                userId,
                PAYMENT_STATUS_SUCCESS,
                EMI_REMARK,
                monthStart,
                monthEndInclusive
        );
    }

    @Scheduled(fixedDelayString = "${payments.pending-timeout-check-ms:15000}")
    public void markExpiredPendingPaymentsAsFailed() {
        long timeoutSeconds = Math.max(1, pendingTimeoutSeconds);
        LocalDateTime cutoff = LocalDateTime.now().minusSeconds(timeoutSeconds);
        List<Payment> expiredPending = paymentRepository.findByStatusAndPaymentDateBefore(
                PAYMENT_STATUS_PENDING,
                cutoff
        );

        for (Payment payment : expiredPending) {
            if (payment.getIdempotencyKey() == null || !payment.getIdempotencyKey().startsWith("stripe-checkout-")) {
                continue;
            }
            if (payment.getRemarks() == null || !payment.getRemarks().startsWith(EMI_REMARK)) {
                continue;
            }
            payment.setStatus(PAYMENT_STATUS_FAILED);
            payment.setRemarks(EMI_REMARK + " - Timed out after " + timeoutSeconds + " second(s)");
            payment.setPaymentDate(LocalDateTime.now());
            paymentRepository.save(payment);
        }
    }

    private PrepaymentRequest getApprovedPrepaymentForCurrentInstallment(
            String userId,
            String loanApplicationId,
            Integer requestedInstallmentNo,
            List<RepaymentScheduleItem> items
    ) {
        Integer nextUnpaidInstallmentNo = items.stream()
                .filter(i -> i.getStatus() == null || !"paid".equalsIgnoreCase(i.getStatus()))
                .map(RepaymentScheduleItem::getInstallmentNo)
                .filter(no -> no != null)
                .min(Integer::compareTo)
                .orElse(null);

        if (nextUnpaidInstallmentNo == null || !nextUnpaidInstallmentNo.equals(requestedInstallmentNo)) {
            return null;
        }

        return prepaymentRequestRepository
                .findByUserIdAndLoanApplicationIdAndStatusOrderByReviewedAtDesc(
                        userId,
                        loanApplicationId,
                        PrepaymentRequestStatus.APPROVED
                )
                .stream()
                .filter(r -> !Boolean.TRUE.equals(r.getConsumed()))
                .findFirst()
                .orElse(null);
    }

    private void recalculateRemainingScheduleAfterPrepayment(
            LoanApplication loan,
            RepaymentScheduleDoc schedule
    ) {
        List<RepaymentScheduleItem> items = schedule.getItems();
        if (items == null || items.isEmpty()) {
            return;
        }

        List<RepaymentScheduleItem> unpaidItems = items.stream()
                .filter(i -> i.getStatus() == null || !"paid".equalsIgnoreCase(i.getStatus()))
                .sorted(Comparator.comparing(RepaymentScheduleItem::getInstallmentNo))
                .toList();

        if (unpaidItems.isEmpty()) {
            return;
        }

        BigDecimal outstandingPrincipal = getOutstandingPrincipal(loan);

        if (outstandingPrincipal.compareTo(BigDecimal.ZERO) <= 0) {
            for (RepaymentScheduleItem item : unpaidItems) {
                item.setAmount(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
                item.setPrincipalAmount(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
                item.setInterestAmount(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
                item.setTotalPayment(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
                item.setBalanceAmount(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
                item.setStatus("paid");
            }
            loan.setStatus(LoanStatus.CLOSED);
            loanApplicationRepository.save(loan);
            return;
        }

        LoanType loanType = loanTypeRepository.findById(loan.getLoanTypeId())
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Loan type not found"));

        final MathContext mc = MathContext.DECIMAL64;
        final RoundingMode rm = RoundingMode.HALF_UP;

        int remainingInstallments = unpaidItems.size();
        BigDecimal monthlyRate = BigDecimal.ZERO;
        if (loanType.getInterestRate() != null && loanType.getInterestRate() > 0) {
            monthlyRate = BigDecimal.valueOf(loanType.getInterestRate())
                    .divide(BigDecimal.valueOf(1200), 12, rm);
        }

        BigDecimal emi;
        if (monthlyRate.compareTo(BigDecimal.ZERO) == 0) {
            emi = outstandingPrincipal.divide(BigDecimal.valueOf(remainingInstallments), 2, rm);
        } else {
            BigDecimal onePlusR = BigDecimal.ONE.add(monthlyRate, mc);
            BigDecimal pow = onePlusR.pow(remainingInstallments, mc);
            BigDecimal numerator = outstandingPrincipal.multiply(monthlyRate, mc).multiply(pow, mc);
            BigDecimal denominator = pow.subtract(BigDecimal.ONE, mc);
            emi = numerator.divide(denominator, 2, rm);
        }

        BigDecimal runningBalance = outstandingPrincipal.setScale(2, rm);
        LocalDate today = LocalDate.now();

        for (int index = 0; index < unpaidItems.size(); index++) {
            RepaymentScheduleItem item = unpaidItems.get(index);
            BigDecimal interest = runningBalance.multiply(monthlyRate, mc).setScale(2, rm);
            BigDecimal principal = emi.subtract(interest).setScale(2, rm);
            BigDecimal total = emi;

            if (index == unpaidItems.size() - 1 || principal.compareTo(runningBalance) > 0) {
                principal = runningBalance;
                total = principal.add(interest).setScale(2, rm);
            }

            runningBalance = runningBalance.subtract(principal).setScale(2, rm);
            if (runningBalance.compareTo(BigDecimal.ZERO) < 0) {
                runningBalance = BigDecimal.ZERO.setScale(2, rm);
            }

            item.setAmount(total);
            item.setTotalPayment(total);
            item.setInterestAmount(interest);
            item.setPrincipalAmount(principal);
            item.setBalanceAmount(runningBalance);

            LocalDate dueDate = parseDate(item.getDueDate());
            if (dueDate != null && dueDate.isBefore(today)) {
                item.setStatus("overdue");
            } else {
                item.setStatus("upcoming");
            }
        }
    }

}
