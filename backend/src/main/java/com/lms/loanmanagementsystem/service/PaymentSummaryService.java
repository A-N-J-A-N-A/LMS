package com.lms.loanmanagementsystem.service;

import com.lms.loanmanagementsystem.dto.AdminProfitabilityResponse;
import com.lms.loanmanagementsystem.dto.LoanTypeProfitabilityItem;
import com.lms.loanmanagementsystem.dto.PaymentSummaryResponse;
import com.lms.loanmanagementsystem.dto.RepaymentScheduleItem;
import com.lms.loanmanagementsystem.model.*;
import com.lms.loanmanagementsystem.repository.LoanApplicationRepository;
import com.lms.loanmanagementsystem.repository.RepaymentScheduleRepository;
import com.lms.loanmanagementsystem.repository.TransactionLedgerRepository;
import lombok.RequiredArgsConstructor;
import org.bson.types.ObjectId;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.springframework.http.HttpStatus.*;

@Service
@RequiredArgsConstructor
public class PaymentSummaryService {

    private final LoanApplicationRepository loanApplicationRepository;
    private final RepaymentScheduleRepository repaymentScheduleRepository;
    private final TransactionLedgerRepository transactionLedgerRepository;

    public PaymentSummaryResponse getUserSummary(String applicationId, String userId) {

        if (applicationId == null || !ObjectId.isValid(applicationId)) {
            throw new ResponseStatusException(BAD_REQUEST, "Invalid applicationId");
        }

        LoanApplication loan = loanApplicationRepository.findById(applicationId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Loan not found"));

        if (!loan.getUserId().equals(userId)) {
            throw new ResponseStatusException(FORBIDDEN, "Unauthorized access");
        }

        return buildSummary(loan);
    }

    public PaymentSummaryResponse getAdminSummary(String applicationId) {

        if (applicationId == null || !ObjectId.isValid(applicationId)) {
            throw new ResponseStatusException(BAD_REQUEST, "Invalid applicationId");
        }

        LoanApplication loan = loanApplicationRepository.findById(applicationId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Loan not found"));

        return buildSummary(loan);
    }

    public AdminProfitabilityResponse getAdminProfitabilitySummary() {
        List<LoanApplication> loans = loanApplicationRepository.findAll();
        List<TransactionLedger> txns = transactionLedgerRepository.findAll();
        Map<String, String> loanTypeByLoanId = new HashMap<>();
        Map<String, BigDecimal> interestByLoanType = new HashMap<>();
        Map<String, Long> countByLoanType = new HashMap<>();

        BigDecimal totalInterestProfit = BigDecimal.ZERO;
        BigDecimal totalPaidBackAmount = BigDecimal.ZERO;
        long interestPaymentCount = 0L;

        for (TransactionLedger t : txns) {
            String loanTypeId = resolveLoanTypeId(t.getLoanId(), loanTypeByLoanId);
            if (t.getTransactionType() == TransactionType.EMI_PAYMENT) {
                BigDecimal interest = nz(t.getInterestComponent());
                if (interest.compareTo(BigDecimal.ZERO) > 0) {
                    totalInterestProfit = totalInterestProfit.add(interest);
                    interestPaymentCount++;
                    interestByLoanType.merge(loanTypeId, interest, BigDecimal::add);
                    countByLoanType.merge(loanTypeId, 1L, Long::sum);
                }
            } else if (t.getTransactionType() == TransactionType.INTEREST) {
                BigDecimal interest = nz(t.getAmount());
                if (interest.compareTo(BigDecimal.ZERO) > 0) {
                    totalInterestProfit = totalInterestProfit.add(interest);
                    interestPaymentCount++;
                    interestByLoanType.merge(loanTypeId, interest, BigDecimal::add);
                    countByLoanType.merge(loanTypeId, 1L, Long::sum);
                }
            }

            if (t.getTransactionType() == TransactionType.EMI_PAYMENT
                    || t.getTransactionType() == TransactionType.PREPAYMENT
                    || t.getTransactionType() == TransactionType.PENALTY
                    || t.getTransactionType() == TransactionType.INTEREST) {
                totalPaidBackAmount = totalPaidBackAmount.add(nz(t.getAmount()));
            }
        }

        List<LoanTypeProfitabilityItem> byLoanType = new ArrayList<>();
        for (Map.Entry<String, BigDecimal> entry : interestByLoanType.entrySet()) {
            String loanTypeId = entry.getKey();
            byLoanType.add(new LoanTypeProfitabilityItem(
                    loanTypeId,
                    entry.getValue(),
                    countByLoanType.getOrDefault(loanTypeId, 0L)
            ));
        }
        byLoanType.sort(Comparator.comparing(LoanTypeProfitabilityItem::getInterestProfit).reversed());

        long disbursedLoanCount = loans.stream()
                .filter(loan -> nz(loan.getDisbursedAmount()).compareTo(BigDecimal.ZERO) > 0)
                .count();

        long closedLoanCount = loans.stream()
                .filter(loan -> loan.getStatus() == LoanStatus.CLOSED)
                .count();

        BigDecimal totalDisbursedAmount = loans.stream()
                .map(loan -> nz(loan.getDisbursedAmount()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        String mostProfitableLoanType = byLoanType.isEmpty()
                ? "N/A"
                : byLoanType.get(0).getLoanTypeId();
        BigDecimal mostProfitableLoanTypeProfit = byLoanType.isEmpty()
                ? BigDecimal.ZERO
                : byLoanType.get(0).getInterestProfit();

        AdminProfitabilityResponse response = new AdminProfitabilityResponse();
        response.setTotalInterestProfit(totalInterestProfit);
        response.setInterestPaymentCount(interestPaymentCount);
        response.setByLoanType(byLoanType);
        response.setDisbursedLoanCount(disbursedLoanCount);
        response.setClosedLoanCount(closedLoanCount);
        response.setTotalDisbursedAmount(totalDisbursedAmount);
        response.setTotalPaidBackAmount(totalPaidBackAmount);
        response.setMostProfitableLoanType(mostProfitableLoanType);
        response.setMostProfitableLoanTypeProfit(mostProfitableLoanTypeProfit);
        return response;
    }

    private String resolveLoanTypeId(String loanId, Map<String, String> loanTypeByLoanId) {
        if (loanId == null || loanId.isBlank()) {
            return "UNKNOWN";
        }
        if (loanTypeByLoanId.containsKey(loanId)) {
            return loanTypeByLoanId.get(loanId);
        }

        String loanTypeId = loanApplicationRepository.findById(loanId)
                .map(LoanApplication::getLoanTypeId)
                .filter(value -> value != null && !value.isBlank())
                .orElse("UNKNOWN");

        loanTypeByLoanId.put(loanId, loanTypeId);
        return loanTypeId;
    }

    private PaymentSummaryResponse buildSummary(LoanApplication loan) {

        // Before disbursement: show zeros (UI will display "Not disbursed yet")
        if (loan.getStatus() != LoanStatus.DISBURSED && loan.getStatus() != LoanStatus.CLOSED) {
            return new PaymentSummaryResponse(
                    BigDecimal.ZERO,
                    BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO,
                    BigDecimal.ZERO, BigDecimal.ZERO
            );
        }

        BigDecimal disbursed = nz(loan.getDisbursedAmount());

        // Read ACTIVE schedule
        RepaymentScheduleDoc schedule = repaymentScheduleRepository
                .findByLoanApplicationIdAndStatus(loan.getId(), "ACTIVE")
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Active schedule not found"));

        // Sum unpaid schedule amounts
        BigDecimal remainingScheduledAmount = BigDecimal.ZERO;
        List<RepaymentScheduleItem> items = schedule.getItems();
        if (items != null) {
            for (RepaymentScheduleItem i : items) {
                String st = i.getStatus();
                if (st == null || !"paid".equalsIgnoreCase(st)) {
                    remainingScheduledAmount = remainingScheduledAmount.add(nz(i.getAmount()));
                }
            }
        }

        // Sum ledger payments
        List<TransactionLedger> txns = transactionLedgerRepository.findByLoanId(loan.getId());

        BigDecimal totalPaid = BigDecimal.ZERO;
        BigDecimal principalPaid = BigDecimal.ZERO;
        BigDecimal interestPaid = BigDecimal.ZERO;
        BigDecimal penaltyPaid = BigDecimal.ZERO;

        for (TransactionLedger t : txns) {

            if (t.getTransactionType() == TransactionType.EMI_PAYMENT) {
                totalPaid = totalPaid.add(nz(t.getAmount()));
                principalPaid = principalPaid.add(nz(t.getPrincipalComponent()));
                interestPaid = interestPaid.add(nz(t.getInterestComponent()));
                penaltyPaid = penaltyPaid.add(nz(t.getPenaltyComponent()));
            }

            if (t.getTransactionType() == TransactionType.PENALTY) {
                totalPaid = totalPaid.add(nz(t.getAmount()));
                penaltyPaid = penaltyPaid.add(nz(t.getAmount()));
            }
        }

        BigDecimal outstandingPrincipal = disbursed.subtract(principalPaid);
        if (outstandingPrincipal.compareTo(BigDecimal.ZERO) < 0) {
            outstandingPrincipal = BigDecimal.ZERO;
        }

        return new PaymentSummaryResponse(
                disbursed,
                totalPaid,
                principalPaid,
                interestPaid,
                penaltyPaid,
                remainingScheduledAmount,
                outstandingPrincipal
        );
    }

    private BigDecimal nz(BigDecimal v) {
        return v == null ? BigDecimal.ZERO : v;
    }
}
