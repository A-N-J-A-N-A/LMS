package com.lms.loanmanagementsystem.service;

import com.lms.loanmanagementsystem.dto.AdminDashboardStatsResponse;
import com.lms.loanmanagementsystem.dto.AdminActiveLoanResponse;
import com.lms.loanmanagementsystem.dto.AdminLoanApplicationResponse;
import com.lms.loanmanagementsystem.dto.AdminLoanTrackerResponse;
import com.lms.loanmanagementsystem.dto.AdminPaymentEntryResponse;
import com.lms.loanmanagementsystem.dto.AdminReviewRequest;
import com.lms.loanmanagementsystem.dto.RepaymentScheduleItem;
import com.lms.loanmanagementsystem.model.*;
import com.lms.loanmanagementsystem.model.LoanApplication;
import com.lms.loanmanagementsystem.model.LoanType;
import com.lms.loanmanagementsystem.model.LoanStatus;
import com.lms.loanmanagementsystem.model.TransactionLedger;
import com.lms.loanmanagementsystem.model.TransactionType;
import com.lms.loanmanagementsystem.repository.LoanApplicationRepository;
import com.lms.loanmanagementsystem.repository.LoanTypeRepository;
import com.lms.loanmanagementsystem.repository.*;
import com.lms.loanmanagementsystem.repository.UserRepository;
import com.lms.loanmanagementsystem.repository.TransactionLedgerRepository;
import lombok.RequiredArgsConstructor;
import org.bson.types.ObjectId;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.springframework.http.HttpStatus.*;

@Service
@RequiredArgsConstructor
public class AdminLoanService {
    private static final List<LoanStatus> ACTIVE_ACCOUNT_STATUSES =
            List.of(LoanStatus.DISBURSED, LoanStatus.ACTIVE);

    private final LoanApplicationRepository loanApplicationRepository;
    private final LoanTypeRepository loanTypeRepository;
    private final UserRepository userRepository;
    private final TransactionLedgerRepository transactionLedgerRepository;
    private final PaymentRepository paymentRepository;
    private final AppNotificationService appNotificationService;
    private static final Pattern DATA_URL_PATTERN = Pattern.compile("^data:([^;]+);base64,(.+)$", Pattern.DOTALL);
    private final RepaymentScheduleRepository repaymentScheduleRepository;

    //  Get ALL (optional status filter)
    public List<AdminLoanApplicationResponse> getAllApplications(LoanStatus status) {

        List<LoanApplication> applications;

        if (status != null) {
            applications = loanApplicationRepository.findByStatus(status);
        } else {
            applications = loanApplicationRepository.findAll();
        }

        return applications.stream().map(this::map).toList();
    }

    //  Get Pending Only
    public List<AdminLoanApplicationResponse> getPendingApplications() {
        return loanApplicationRepository.findByStatus(LoanStatus.APPLIED)
                .stream()
                .map(this::map)
                .toList();
    }

    //  Get By ID
    public AdminLoanApplicationResponse getApplicationById(String id) {

        if (!ObjectId.isValid(id)) {
            throw new ResponseStatusException(BAD_REQUEST, "Invalid application id");
        }

        LoanApplication app = loanApplicationRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Application not found"));

        return map(app);
    }

    //  Approve
    public AdminLoanApplicationResponse approve(
            String id,
            String adminId,
            AdminReviewRequest request
    ) {
        LoanApplication app = getEntity(id);

        if (app.getStatus() != LoanStatus.APPLIED) {
            throw new ResponseStatusException(BAD_REQUEST, "Application already reviewed");
        }

        User user = userRepository.findById(app.getUserId())
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "User not found"));
        if (user.getKycStatus() != KycStatus.VERIFIED) {
            throw new ResponseStatusException(BAD_REQUEST, "Loan cannot be approved until KYC is verified.");
        }

        ensureNoDuplicateActiveLoanType(app, id, "approve");

        app.setStatus(LoanStatus.APPROVED);
        app.setReviewedBy(adminId);
        app.setReviewComment(request.getComment());
        app.setReviewedAt(LocalDateTime.now());

        loanApplicationRepository.save(app);
        LoanType loanType = loanTypeRepository
                .findById(app.getLoanTypeId())
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Loan type not found"));

        appNotificationService.notifyUser(
                app.getUserId(),
                "Loan Application Approved",
                "Your " + loanType.getName() + " loan application (Application ID: " + app.getId() + ") has been approved.",
                "LOAN_APPROVED",
                app.getId()
        );

        return map(app);
    }

    //  Reject
    public AdminLoanApplicationResponse reject(
            String id,
            String adminId,
            AdminReviewRequest request
    ) {
        LoanApplication app = getEntity(id);

        if (app.getStatus() != LoanStatus.APPLIED) {
            throw new ResponseStatusException(BAD_REQUEST, "Application already reviewed");
        }


        app.setStatus(LoanStatus.REJECTED);
        app.setReviewedBy(adminId);
        app.setReviewComment(request.getComment());
        app.setReviewedAt(LocalDateTime.now());

        loanApplicationRepository.save(app);
        LoanType loanType = loanTypeRepository.findById(app.getLoanTypeId())
                .orElse(null); // in case it's missing

        String loanName = loanType != null ? loanType.getName() : "Loan";

        appNotificationService.notifyUser(
                app.getUserId(),
                "Loan Application Rejected",
                "Your " + loanName + " application (Application ID: " + app.getId() + ") has been rejected by admin.",
                "LOAN_REJECTED",
                app.getId()
        );

        return map(app);
    }

    //  Dashboard Stats
    public AdminDashboardStatsResponse getDashboardStats() {

        List<LoanApplication> loans = loanApplicationRepository.findAll();
        List<RepaymentScheduleDoc> schedules = repaymentScheduleRepository.findAll();
        List<TransactionLedger> ledgers = transactionLedgerRepository.findAll();
        List<Payment> payments = paymentRepository.findAll();

        long total = loans.size();
        long pending = loans.stream().filter(l -> l.getStatus() == LoanStatus.APPLIED).count();
        long approved = loans.stream().filter(l -> l.getStatus() == LoanStatus.APPROVED).count();
        long rejected = loans.stream().filter(l -> l.getStatus() == LoanStatus.REJECTED).count();

        long totalLoansIssued = loans.stream()
                .filter(l -> l.getStatus() == LoanStatus.DISBURSED
                        || l.getStatus() == LoanStatus.ACTIVE
                        || l.getStatus() == LoanStatus.CLOSED)
                .count();
        long activeLoans = loans.stream()
                .filter(l -> isActiveLoanStatus(l.getStatus()))
                .count();
        long closedLoans = loans.stream()
                .filter(l -> l.getStatus() == LoanStatus.CLOSED)
                .count();
        long totalCustomers = userRepository.findByRole("USER").size();

        Map<String, RepaymentScheduleDoc> latestScheduleByLoanId = new HashMap<>();
        for (RepaymentScheduleDoc schedule : schedules) {
            if (schedule == null || schedule.getLoanApplicationId() == null) {
                continue;
            }
            RepaymentScheduleDoc existing = latestScheduleByLoanId.get(schedule.getLoanApplicationId());
            int incomingVersion = schedule.getVersion() == null ? 0 : schedule.getVersion();
            int existingVersion = existing == null || existing.getVersion() == null ? -1 : existing.getVersion();
            if (existing == null || incomingVersion > existingVersion) {
                latestScheduleByLoanId.put(schedule.getLoanApplicationId(), schedule);
            }
        }

        BigDecimal totalAmountDisbursed = loans.stream()
                .map(loan -> nz(loan.getDisbursedAmount()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<String, BigDecimal> principalRecoveredByLoan = new HashMap<>();
        BigDecimal emiCollectedToday = BigDecimal.ZERO;
        BigDecimal emiCollectedThisMonth = BigDecimal.ZERO;
        BigDecimal prepaymentAmount = BigDecimal.ZERO;
        BigDecimal penaltyAmount = BigDecimal.ZERO;
        long penaltyCount = 0L;
        long onTimePayments = 0L;
        long latePayments = 0L;
        Map<String, BigDecimal> ledgerAmountByPaymentId = new HashMap<>();

        LocalDate today = LocalDate.now();
        LocalDate monthStart = today.withDayOfMonth(1);
        LocalDate next7 = today.plusDays(7);
        LocalDate next30 = today.plusDays(30);
        LocalDate npaThreshold = today.minusDays(90);

        Map<String, Map<Integer, LocalDate>> dueDateByLoanInstallment = new HashMap<>();
        for (Map.Entry<String, RepaymentScheduleDoc> entry : latestScheduleByLoanId.entrySet()) {
            Map<Integer, LocalDate> dueByInstallment = new HashMap<>();
            List<RepaymentScheduleItem> items = entry.getValue().getItems();
            if (items != null) {
                for (RepaymentScheduleItem item : items) {
                    if (item == null || item.getInstallmentNo() == null) {
                        continue;
                    }
                    LocalDate dueDate = parseScheduleDate(item.getDueDate());
                    if (dueDate != null) {
                        dueByInstallment.put(item.getInstallmentNo(), dueDate);
                    }
                }
            }
            dueDateByLoanInstallment.put(entry.getKey(), dueByInstallment);
        }

        for (TransactionLedger ledger : ledgers) {
            if (ledger == null) {
                continue;
            }
            TransactionType type = ledger.getTransactionType();
            BigDecimal amount = nz(ledger.getAmount());

            if (ledger.getPaymentId() != null && !ledger.getPaymentId().isBlank()) {
                ledgerAmountByPaymentId.merge(ledger.getPaymentId(), amount, BigDecimal::add);
            }

            if (type == TransactionType.EMI_PAYMENT) {
                principalRecoveredByLoan.merge(
                        ledger.getLoanId(),
                        nz(ledger.getPrincipalComponent()),
                        BigDecimal::add
                );
                LocalDate paidOn = toLocalDate(ledger.getTimestamp());
                if (paidOn != null) {
                    if (paidOn.equals(today)) {
                        emiCollectedToday = emiCollectedToday.add(amount);
                    }
                    if (!paidOn.isBefore(monthStart) && !paidOn.isAfter(today)) {
                        emiCollectedThisMonth = emiCollectedThisMonth.add(amount);
                    }
                }

                Map<Integer, LocalDate> dueByInstallment =
                        dueDateByLoanInstallment.getOrDefault(ledger.getLoanId(), Map.of());
                LocalDate dueDate = dueByInstallment.get(ledger.getInstallmentNo());
                if (dueDate != null && paidOn != null) {
                    if (paidOn.isAfter(dueDate)) {
                        latePayments++;
                    } else {
                        onTimePayments++;
                    }
                }
            } else if (type == TransactionType.PREPAYMENT) {
                prepaymentAmount = prepaymentAmount.add(amount);
                principalRecoveredByLoan.merge(ledger.getLoanId(), amount, BigDecimal::add);
            } else if (type == TransactionType.PENALTY) {
                penaltyAmount = penaltyAmount.add(amount);
                if (amount.compareTo(BigDecimal.ZERO) > 0) {
                    penaltyCount++;
                }
            }
        }

        BigDecimal totalOutstandingPrincipal = BigDecimal.ZERO;
        for (LoanApplication loan : loans) {
            if (!isActiveLoanStatus(loan.getStatus())) {
                continue;
            }
            BigDecimal disbursed = nz(loan.getDisbursedAmount());
            BigDecimal recovered = principalRecoveredByLoan.getOrDefault(loan.getId(), BigDecimal.ZERO);
            BigDecimal outstanding = disbursed.subtract(recovered);
            if (outstanding.compareTo(BigDecimal.ZERO) > 0) {
                totalOutstandingPrincipal = totalOutstandingPrincipal.add(outstanding);
            }
        }

        BigDecimal overdueAmount = BigDecimal.ZERO;
        long upcomingEmisNext7Days = 0L;
        long upcomingEmisNext30Days = 0L;
        long missedEmis = 0L;
        Set<String> defaultedNpaLoanIds = new HashSet<>();

        for (LoanApplication loan : loans) {
            if (!isActiveLoanStatus(loan.getStatus())) {
                continue;
            }
            RepaymentScheduleDoc schedule = latestScheduleByLoanId.get(loan.getId());
            if (schedule == null || schedule.getItems() == null) {
                continue;
            }
            for (RepaymentScheduleItem item : schedule.getItems()) {
                if (item == null || "paid".equalsIgnoreCase(item.getStatus())) {
                    continue;
                }

                LocalDate dueDate = parseScheduleDate(item.getDueDate());
                if (dueDate == null) {
                    continue;
                }
                BigDecimal installmentAmount = nz(item.getTotalPayment());
                if (installmentAmount.compareTo(BigDecimal.ZERO) <= 0) {
                    installmentAmount = nz(item.getAmount());
                }

                if (dueDate.isBefore(today)) {
                    overdueAmount = overdueAmount.add(installmentAmount);
                    missedEmis++;
                    if (dueDate.isBefore(npaThreshold)) {
                        defaultedNpaLoanIds.add(loan.getId());
                    }
                } else {
                    if (!dueDate.isAfter(next7)) {
                        upcomingEmisNext7Days++;
                    }
                    if (!dueDate.isAfter(next30)) {
                        upcomingEmisNext30Days++;
                    }
                }
            }
        }

        BigDecimal excessPaymentAmount = BigDecimal.ZERO;
        for (Payment payment : payments) {
            if (payment == null || payment.getId() == null) {
                continue;
            }
            if (!"SUCCESS".equalsIgnoreCase(payment.getStatus())) {
                continue;
            }
            if (!"FORECLOSURE".equalsIgnoreCase(payment.getRemarks())) {
                continue;
            }
            BigDecimal paidAmount = nz(payment.getAmount());
            BigDecimal allocatedAmount = ledgerAmountByPaymentId.getOrDefault(payment.getId(), BigDecimal.ZERO);
            BigDecimal excess = paidAmount.subtract(allocatedAmount);
            if (excess.compareTo(BigDecimal.ZERO) > 0) {
                excessPaymentAmount = excessPaymentAmount.add(excess);
            }
        }

        return new AdminDashboardStatsResponse(
                total,
                pending,
                approved,
                rejected,
                totalLoansIssued,
                activeLoans,
                closedLoans,
                defaultedNpaLoanIds.size(),
                totalCustomers,
                totalAmountDisbursed,
                totalOutstandingPrincipal,
                emiCollectedToday,
                emiCollectedThisMonth,
                overdueAmount,
                prepaymentAmount,
                excessPaymentAmount,
                pending,
                approved,
                rejected,
                approved,
                upcomingEmisNext7Days,
                upcomingEmisNext30Days,
                onTimePayments,
                latePayments,
                missedEmis,
                penaltyAmount,
                penaltyCount
        );
    }

    //  Internal entity fetch
    private LoanApplication getEntity(String id) {
        if (!ObjectId.isValid(id)) {
            throw new ResponseStatusException(BAD_REQUEST, "Invalid application id");
        }

        return loanApplicationRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Application not found"));

    }

    //  Mapper
    private AdminLoanApplicationResponse map(LoanApplication app) {
        User user = userRepository.findById(app.getUserId()).orElse(null);
        String customerName = user == null ? "Unknown User" : user.getFullName();
        String kycStatus = java.util.Optional.ofNullable(user)
                .map(User::getKycStatus)
                .map(Enum::name)
                .orElse("UNKNOWN");

        return new AdminLoanApplicationResponse(
                app.getId(),
                app.getUserId(),
                customerName,
                kycStatus,
                app.getLoanTypeId(),
                app.getAmount(),
                app.getTenure(),
                app.getStatus(),
                app.getReviewedBy(),
                app.getReviewComment(),
                app.getReviewedAt(),
                app.getApplicationData()
        );
    }

    public LoanApplication disburseLoan(String loanId, String adminId, BigDecimal amount) {

        if (!ObjectId.isValid(loanId)) {
            throw new ResponseStatusException(BAD_REQUEST, "Invalid loan/application id");
        }

        LoanApplication loan = loanApplicationRepository.findById(loanId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Loan not found"));

        // Prevent double disbursement (either already disbursed OR ledger exists)
        if (LoanStatus.DISBURSED.equals(loan.getStatus())) {
            throw new ResponseStatusException(CONFLICT, "Loan already disbursed");
        }

        // Strict lifecycle rule
        if (!LoanStatus.APPROVED.equals(loan.getStatus())) {
            throw new ResponseStatusException(BAD_REQUEST, "Only APPROVED loans can be disbursed");
        }

        ensureNoDuplicateActiveLoanType(loan, loanId, "disburse");

        // Amount validation
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new ResponseStatusException(BAD_REQUEST, "Disbursement amount must be greater than 0");
        }

        if (amount.compareTo(loan.getAmount()) > 0) {
            throw new ResponseStatusException(BAD_REQUEST, "Disbursement amount cannot exceed approved amount");
        }

        if (transactionLedgerRepository.existsByLoanIdAndTransactionType(
                loan.getId(),
                TransactionType.PRINCIPAL_DISBURSEMENT
        )) {
            throw new ResponseStatusException(CONFLICT, "Disbursement already recorded");
        }

        if (repaymentScheduleRepository.existsByLoanApplicationIdAndStatus(
                loan.getId(), "ACTIVE")) {
            throw new ResponseStatusException(CONFLICT, "Active repayment schedule already exists");
        }

        LoanType loanType = loanTypeRepository.findById(loan.getLoanTypeId())
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Loan type not found"));

        LocalDateTime now = LocalDateTime.now();

        loan.setStatus(LoanStatus.DISBURSED);
        loan.setDisbursedAmount(amount);
        loan.setDisbursedAt(now);
        loan.setDisbursedBy(adminId);

        LoanApplication saved = loanApplicationRepository.save(loan);
        userRepository.findById(saved.getUserId())
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "User not found"));

        TransactionLedger ledger = TransactionLedger.builder()
                .loanId(saved.getId())
                .transactionType(TransactionType.PRINCIPAL_DISBURSEMENT)
                .amount(amount)
                .timestamp(now)
                .remarks("Principal disbursed by admin " + adminId)
                .build();

        transactionLedgerRepository.save(ledger);

        appNotificationService.notifyUser(
                saved.getUserId(),
                "Loan Amount Disbursed",
                "Your " + loanType.getName() +
                        " of INR " + amount +
                        " has been successfully disbursed (Application ID: " + saved.getId() + ").",
                "LOAN_DISBURSED",
                saved.getId()
        );

        List<RepaymentScheduleItem> items = generateRepaymentSchedule(
                saved.getDisbursedAmount(),
                saved.getTenure(),
                loanType.getInterestRate(),
                saved.getDisbursedAt()
        );

        RepaymentScheduleDoc scheduleV1 = RepaymentScheduleDoc.builder()
                .loanApplicationId(saved.getId())
                .version(1)
                .status("ACTIVE")
                .createdAt(now)
                .createdBy(adminId)
                .reason("DISBURSEMENT")
                .effectiveFrom(now)
                .items(items)
                .build();

        repaymentScheduleRepository.save(scheduleV1);

        return saved;
    }

    private void ensureNoDuplicateActiveLoanType(
            LoanApplication application,
            String currentApplicationId,
            String action
    ) {
        boolean duplicateExists = loanApplicationRepository.existsByUserIdAndLoanTypeIdAndStatusInAndIdNot(
                application.getUserId(),
                application.getLoanTypeId(),
                ACTIVE_ACCOUNT_STATUSES,
                currentApplicationId
        );

        if (duplicateExists) {
            throw new ResponseStatusException(
                    CONFLICT,
                    "Cannot " + action + " this application because user already has an active "
                            + application.getLoanTypeId() + " loan account"
            );
        }
    }

    public List<AdminActiveLoanResponse> getActiveLoans() {
        List<LoanApplication> activeLoans = loanApplicationRepository.findByStatusIn(
                List.of(LoanStatus.DISBURSED, LoanStatus.ACTIVE)
        );

        return activeLoans.stream()
                .map(this::toActiveLoanResponse)
                .toList();
    }

    public AdminLoanTrackerResponse getLoanRepaymentTracker(String applicationId) {
        LoanApplication application = getEntity(applicationId);

        if (!(application.getStatus() == LoanStatus.DISBURSED || application.getStatus() == LoanStatus.ACTIVE)) {
            throw new ResponseStatusException(BAD_REQUEST, "Repayment tracker is available only for active/disbursed loans");
        }

        LoanType loanType = loanTypeRepository.findById(application.getLoanTypeId())
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Loan type not found"));
        RepaymentScheduleDoc activeSchedule = repaymentScheduleRepository
                .findByLoanApplicationIdAndStatus(application.getId(), "ACTIVE")
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Active repayment schedule not found"));

        List<TransactionLedger> allTransactions =
                transactionLedgerRepository.findByLoanIdOrderByTimestampDesc(applicationId);

        List<TransactionLedger> emiPayments =
                transactionLedgerRepository.findByLoanIdAndTransactionTypeOrderByTimestampAsc(
                        applicationId,
                        TransactionType.EMI_PAYMENT
                );

        List<RepaymentScheduleItem> schedule = activeSchedule.getItems() == null
                ? List.of()
                : activeSchedule.getItems();

        BigDecimal totalPaid = emiPayments.stream()
                .map(TransactionLedger::getAmount)
                .filter(amount -> amount != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalPayable = schedule.stream()
                .map(RepaymentScheduleItem::getTotalPayment)
                .filter(amount -> amount != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal outstanding = totalPayable.subtract(totalPaid);
        if (outstanding.compareTo(BigDecimal.ZERO) < 0) {
            outstanding = BigDecimal.ZERO;
        }

        return new AdminLoanTrackerResponse(
                application.getId(),
                application.getUserId(),
                getCustomerName(application.getUserId()),
                application.getLoanTypeId(),
                application.getStatus(),
                application.getAmount(),
                getPrincipalAmount(application),
                application.getTenure(),
                loanType.getInterestRate(),
                application.getDisbursedAt(),
                schedule.size(),
                (int) schedule.stream()
                        .filter(item -> "paid".equalsIgnoreCase(item.getStatus()))
                        .count(),
                totalPaid,
                totalPayable,
                outstanding,
                schedule,
                allTransactions.stream()
                        .map(entry -> new AdminPaymentEntryResponse(
                                entry.getId(),
                                entry.getTransactionType(),
                                entry.getAmount(),
                                entry.getTimestamp(),
                                entry.getRemarks()
                        ))
                        .toList()
        );
    }

    public DocumentPayload getApplicationDocument(
            String applicationId,
            String fieldName
    ) {
        LoanApplication application = getEntity(applicationId);
        Map<String, Object> applicationData = application.getApplicationData();

        if (applicationData == null || !applicationData.containsKey(fieldName)) {
            throw new ResponseStatusException(NOT_FOUND, "Document field not found");
        }

        Object value = applicationData.get(fieldName);
        if (!(value instanceof String rawValue)) {
            throw new ResponseStatusException(BAD_REQUEST, "Requested field is not a document");
        }

        return parseStoredDocument(rawValue, fieldName);
    }

    private DocumentPayload parseStoredDocument(String rawValue, String fieldName) {
        String trimmed = rawValue.trim();
        if (trimmed.isEmpty()) {
            throw new ResponseStatusException(BAD_REQUEST, "Document is empty");
        }

        Matcher matcher = DATA_URL_PATTERN.matcher(trimmed);
        String mimeType = "application/octet-stream";
        String base64Payload = trimmed;

        if (matcher.matches()) {
            mimeType = matcher.group(1);
            base64Payload = matcher.group(2);
        }

        byte[] content;
        try {
            content = Base64.getDecoder().decode(base64Payload.getBytes(StandardCharsets.UTF_8));
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(BAD_REQUEST, "Invalid document encoding");
        }

        return new DocumentPayload(
                content,
                mimeType,
                buildFilename(fieldName, mimeType)
        );
    }

    private String buildFilename(String fieldName, String mimeType) {
        String safeName = fieldName
                .replaceAll("[^a-zA-Z0-9._-]", "_")
                .replaceAll("_+", "_")
                .replaceAll("^_+|_+$", "");

        if (safeName.isBlank()) {
            safeName = "document";
        }

        String extension = switch (mimeType.toLowerCase()) {
            case "application/pdf" -> "pdf";
            case "image/jpeg" -> "jpg";
            case "image/png" -> "png";
            default -> "bin";
        };

        if (safeName.endsWith("." + extension)) {
            return safeName;
        }
        return safeName + "." + extension;
    }

    private AdminActiveLoanResponse toActiveLoanResponse(LoanApplication application) {
        AdminLoanTrackerResponse tracker = getLoanRepaymentTracker(application.getId());
        String nextDueDate = tracker.getRepaymentSchedule().stream()
                .filter(item -> !"paid".equalsIgnoreCase(item.getStatus()))
                .map(RepaymentScheduleItem::getDueDate)
                .findFirst()
                .orElse("-");

        return new AdminActiveLoanResponse(
                tracker.getApplicationId(),
                tracker.getUserId(),
                tracker.getCustomerName(),
                tracker.getLoanTypeId(),
                tracker.getStatus(),
                tracker.getSanctionedAmount(),
                tracker.getDisbursedAmount(),
                tracker.getTenure(),
                tracker.getDisbursedAt(),
                nextDueDate,
                tracker.getTotalInstallments(),
                tracker.getPaidInstallments(),
                tracker.getTotalPaidAmount(),
                tracker.getOutstandingAmount()
        );
    }

    private BigDecimal getPrincipalAmount(LoanApplication application) {
        if (application.getDisbursedAmount() != null && application.getDisbursedAmount().compareTo(BigDecimal.ZERO) > 0) {
            return application.getDisbursedAmount();
        }
        return application.getAmount();
    }

    private String getCustomerName(String userId) {
        return userRepository.findById(userId)
                .map(user -> user.getFullName())
                .orElse("Unknown User");
    }

    private BigDecimal nz(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    private LocalDate parseScheduleDate(String dueDate) {
        if (dueDate == null || dueDate.isBlank()) {
            return null;
        }
        try {
            return LocalDate.parse(dueDate);
        } catch (Exception ex) {
            return null;
        }
    }

    private LocalDate toLocalDate(LocalDateTime value) {
        return value == null ? null : value.toLocalDate();
    }

    private boolean isActiveLoanStatus(LoanStatus status) {
        return status == LoanStatus.DISBURSED || status == LoanStatus.ACTIVE;
    }

    private List<RepaymentScheduleItem> generateRepaymentSchedule(
            BigDecimal amount,
            Integer tenure,
            Double annualInterestRate,
            LocalDateTime disbursedAt,
            int paidInstallments
    ) {
        if (amount == null || tenure == null || tenure <= 0) {
            return List.of();
        }

        final MathContext mc = MathContext.DECIMAL64;
        final RoundingMode roundingMode = RoundingMode.HALF_UP;

        BigDecimal monthlyRate = BigDecimal.ZERO;
        if (annualInterestRate != null && annualInterestRate > 0) {
            monthlyRate = BigDecimal.valueOf(annualInterestRate)
                    .divide(BigDecimal.valueOf(1200), 12, roundingMode);
        }

        BigDecimal emi;
        if (monthlyRate.compareTo(BigDecimal.ZERO) == 0) {
            emi = amount.divide(BigDecimal.valueOf(tenure), 2, roundingMode);
        } else {
            BigDecimal onePlusR = BigDecimal.ONE.add(monthlyRate, mc);
            BigDecimal pow = onePlusR.pow(tenure, mc);
            BigDecimal numerator = amount.multiply(monthlyRate, mc).multiply(pow, mc);
            BigDecimal denominator = pow.subtract(BigDecimal.ONE, mc);
            emi = numerator.divide(denominator, 2, roundingMode);
        }

        List<RepaymentScheduleItem> schedule = new ArrayList<>();
        BigDecimal remainingBalance = amount.setScale(2, roundingMode);

        LocalDate startDate = disbursedAt != null
                ? disbursedAt.toLocalDate()
                : LocalDate.now();
        LocalDate today = LocalDate.now();

        for (int i = 1; i <= tenure; i++) {
            BigDecimal interestAmount = remainingBalance.multiply(monthlyRate, mc)
                    .setScale(2, roundingMode);

            BigDecimal principalAmount = emi.subtract(interestAmount).setScale(2, roundingMode);
            BigDecimal totalPayment = emi;

            if (i == tenure || principalAmount.compareTo(remainingBalance) > 0) {
                principalAmount = remainingBalance;
                totalPayment = principalAmount.add(interestAmount).setScale(2, roundingMode);
            }

            remainingBalance = remainingBalance.subtract(principalAmount).setScale(2, roundingMode);
            if (remainingBalance.compareTo(BigDecimal.ZERO) < 0) {
                remainingBalance = BigDecimal.ZERO.setScale(2, roundingMode);
            }

            LocalDate dueDate = startDate.plusMonths(i);
            String status;
            if (i <= paidInstallments) {
                status = "paid";
            } else if (dueDate.isBefore(today)) {
                status = "overdue";
            } else {
                status = "upcoming";
            }

            schedule.add(
                    new RepaymentScheduleItem(
                            i,
                            dueDate.toString(),
                            totalPayment,
                            principalAmount,
                            interestAmount,
                            totalPayment,
                            remainingBalance,
                            status
                    )
            );
        }
        return schedule;
    }

    public record DocumentPayload(byte[] bytes, String mimeType, String filename) {}
    private List<RepaymentScheduleItem> generateRepaymentSchedule(
            BigDecimal amount,
            Integer tenure,
            Double annualInterestRate,
            LocalDateTime startAt
    ) {
        final MathContext mc = MathContext.DECIMAL64;
        final RoundingMode roundingMode = RoundingMode.HALF_UP;

        BigDecimal monthlyRate = BigDecimal.ZERO;
        if (annualInterestRate != null && annualInterestRate > 0) {
            monthlyRate = BigDecimal.valueOf(annualInterestRate)
                    .divide(BigDecimal.valueOf(1200), 12, roundingMode);
        }

        BigDecimal emi;
        if (monthlyRate.compareTo(BigDecimal.ZERO) == 0) {
            emi = amount.divide(BigDecimal.valueOf(tenure), 2, roundingMode);
        } else {
            BigDecimal onePlusR = BigDecimal.ONE.add(monthlyRate, mc);
            BigDecimal pow = onePlusR.pow(tenure, mc);
            BigDecimal numerator = amount.multiply(monthlyRate, mc).multiply(pow, mc);
            BigDecimal denominator = pow.subtract(BigDecimal.ONE, mc);
            emi = numerator.divide(denominator, 2, roundingMode);
        }

        List<RepaymentScheduleItem> schedule = new ArrayList<>();
        BigDecimal remainingBalance = amount.setScale(2, roundingMode);

        LocalDate startDate = startAt != null
                ? startAt.toLocalDate()
                : LocalDate.now();

        for (int i = 1; i <= tenure; i++) {

            BigDecimal interestAmount = remainingBalance.multiply(monthlyRate, mc)
                    .setScale(2, roundingMode);

            BigDecimal principalAmount = emi.subtract(interestAmount)
                    .setScale(2, roundingMode);

            BigDecimal totalPayment = emi;

            if (i == tenure || principalAmount.compareTo(remainingBalance) > 0) {
                principalAmount = remainingBalance;
                totalPayment = principalAmount.add(interestAmount).setScale(2, roundingMode);
            }

            remainingBalance = remainingBalance.subtract(principalAmount)
                    .setScale(2, roundingMode);

            if (remainingBalance.compareTo(BigDecimal.ZERO) < 0) {
                remainingBalance = BigDecimal.ZERO.setScale(2, roundingMode);
            }

            LocalDate dueDate = startDate.plusMonths(i);

            schedule.add(new RepaymentScheduleItem(
                    i,
                    dueDate.toString(),
                    totalPayment,
                    principalAmount,
                    interestAmount,
                    totalPayment,
                    remainingBalance,
                    "upcoming"
            ));
        }

        return schedule;
    }


}
