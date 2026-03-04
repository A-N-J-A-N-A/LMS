package com.lms.loanmanagementsystem.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lms.loanmanagementsystem.dto.*;
import com.lms.loanmanagementsystem.model.*;
import com.lms.loanmanagementsystem.repository.*;
import lombok.RequiredArgsConstructor;
import org.apache.commons.codec.digest.DigestUtils;
import org.bson.types.ObjectId;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

import static org.springframework.http.HttpStatus.*;

@Service
@RequiredArgsConstructor
public class LoanService {
    private static final List<LoanStatus> BLOCKING_SAME_TYPE_APPLICATION_STATUSES =
            List.of(LoanStatus.APPLIED, LoanStatus.APPROVED, LoanStatus.DISBURSED, LoanStatus.ACTIVE);

    private final LoanTypeRepository loanTypeRepository;
    private final LoanApplicationRepository loanApplicationRepository;
    private final LoanDescriptionRepository loanDescriptionRepository;
    private final UserRepository userRepository;
    private final TransactionLedgerRepository transactionLedgerRepository;
    private final IdempotencyRepository idempotencyRepository;
    private final RepaymentScheduleRepository repaymentScheduleRepository;
    private final AppNotificationService appNotificationService;
    @Value("${app.idempotency.loan-apply-window-seconds:300}")
    private long loanApplyIdempotencyWindowSeconds;

    public List<LoanType> getActiveLoans() {
        return loanTypeRepository.findByStatus("ACTIVE");
    }

    public LoanType getLoanById(String loanId) {
        return loanTypeRepository.findByIdAndStatus(loanId, "ACTIVE")
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Loan not available"));
    }

    public ApplyLoanResponse applyLoan(ApplyLoanRequest request, String userId, String idempotencyKey) {

        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            throw new ResponseStatusException(BAD_REQUEST, "Idempotency-Key header is required");
        }

        if (userId == null || !ObjectId.isValid(userId)) {
            throw new ResponseStatusException(BAD_REQUEST, "Invalid user id");
        }

        String requestHash = hashRequest(request);

        Optional<IdempotencyRecord> existing =
                idempotencyRepository.findByIdempotencyKey(idempotencyKey);

        if (existing.isPresent()) {

            IdempotencyRecord record = existing.get();

            if (!record.getUserId().equals(userId)) {
                throw new ResponseStatusException(CONFLICT, "Idempotency key already used by another user");
            }

            if (!record.getRequestHash().equals(requestHash)) {
                throw new ResponseStatusException(CONFLICT, "Idempotency key reused with different request payload");
            }

            if (!isWithinIdempotencyWindow(record)) {
                idempotencyRepository.delete(record);
            } else {
                return deserializeResponse(record.getResponseBody());
            }
        }

        ApplyLoanResponse response = processLoanNormally(request, userId);

        LocalDateTime now = LocalDateTime.now();
        IdempotencyRecord record = IdempotencyRecord.builder()
                .idempotencyKey(idempotencyKey)
                .userId(userId)
                .requestHash(requestHash)
                .responseBody(serializeResponse(response))
                .httpStatus(200)
                .createdAt(now)
                .expiresAt(now.plusSeconds(Math.max(1, loanApplyIdempotencyWindowSeconds)))
                .build();

        try {
            idempotencyRepository.save(record);
        } catch (Exception e) {
            // Race condition protection
            IdempotencyRecord saved =
                    idempotencyRepository.findByIdempotencyKey(idempotencyKey).orElseThrow();
            if (saved.getUserId().equals(userId) && saved.getRequestHash().equals(requestHash) && isWithinIdempotencyWindow(saved)) {
                return deserializeResponse(saved.getResponseBody());
            }
            throw new ResponseStatusException(CONFLICT, "Idempotency key conflict");
        }

        return response;
    }

    private boolean isWithinIdempotencyWindow(IdempotencyRecord record) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime expiresAt = record.getExpiresAt();

        if (expiresAt != null) {
            return now.isBefore(expiresAt);
        }

        LocalDateTime createdAt = record.getCreatedAt();
        if (createdAt == null) {
            return false;
        }

        return now.isBefore(createdAt.plusSeconds(Math.max(1, loanApplyIdempotencyWindowSeconds)));
    }

    private ApplyLoanResponse processLoanNormally(ApplyLoanRequest request, String userId) {

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "User not found"));

        LoanType loanType = loanTypeRepository
                .findByIdAndStatus(request.getLoanTypeId(), "ACTIVE")
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Loan type not available"));

        boolean hasActiveSameTypeLoan = loanApplicationRepository.existsByUserIdAndLoanTypeIdAndStatusIn(
                userId,
                loanType.getId(),
                BLOCKING_SAME_TYPE_APPLICATION_STATUSES
        );

        if (hasActiveSameTypeLoan) {
            throw new ResponseStatusException(
                    CONFLICT,
                    "A loan application for this loan type already exists and is still in progress."
            );
        }

        validateLoanAmountAndTenure(loanType, request.getAmount(), request.getTenure());
        validateDynamicApplicationData(request.getLoanTypeId(), request.getApplicationData());

        LoanApplication application = LoanApplication.builder()
                .userId(userId)
                .loanTypeId(loanType.getId())
                .amount(request.getAmount())
                .tenure(request.getTenure())
                .status(LoanStatus.APPLIED)
                .applicationData(request.getApplicationData())
                .createdAt(LocalDateTime.now())
                .build();

        LoanApplication saved = loanApplicationRepository.save(application);

        if (user.getKycStatus() == KycStatus.NOT_SUBMITTED) {
            appNotificationService.notifyUser(
                    userId,
                    "KYC Required",
                    "Your loan application is pending. Please complete your KYC to proceed further.",
                    "KYC_REQUIRED",
                    saved.getId()
            );
        }

        return new ApplyLoanResponse(saved.getId(), "Loan application submitted successfully");
    }

    public LoanApplicationDetailResponse getLoanApplicationDetails(String applicationId, Authentication authentication) {

        if (applicationId == null || !ObjectId.isValid(applicationId)) {
            throw new ResponseStatusException(BAD_REQUEST, "Invalid application ID");
        }

        LoanApplication application = loanApplicationRepository.findById(applicationId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Application not found"));

        String authUserId = authentication.getName();

        if (!application.getUserId().equals(authUserId)) {
            throw new ResponseStatusException(FORBIDDEN, "Unauthorized access");
        }

        LoanType loanType = loanTypeRepository.findById(application.getLoanTypeId())
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Loan type not found"));

        List<RepaymentScheduleItem> schedule = Collections.emptyList();

        if (application.getStatus() == LoanStatus.DISBURSED || application.getStatus() == LoanStatus.ACTIVE) {
            if (repaymentScheduleRepository.existsByLoanApplicationId(application.getId())) {
                // Load existing schedule from DB
                RepaymentScheduleDoc active = repaymentScheduleRepository
                        .findByLoanApplicationIdAndStatus(application.getId(), "ACTIVE")
                        .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Repayment schedule not found"));

                schedule = active.getItems() == null ? Collections.emptyList() : active.getItems();
            } else if (application.getDisbursedAt() != null) {
                // Generate schedule if not saved yet
                schedule = generateRepaymentSchedule(
                        application.getDisbursedAmount() != null ? application.getDisbursedAmount() : application.getAmount(),
                        loanType.getInterestRate().doubleValue(),
                        application.getTenure(),
                        application.getDisbursedAt().toLocalDate()
                );

                // Save schedule in DB
                RepaymentScheduleDoc doc = RepaymentScheduleDoc.builder()
                        .loanApplicationId(application.getId())
                        .status("ACTIVE")
                        .items(schedule)
                        .createdAt(LocalDateTime.now())
                        .build();

                repaymentScheduleRepository.save(doc);
            }
        }


        return new LoanApplicationDetailResponse(
                application.getId(),
                application.getLoanTypeId(),
                loanType.getName(),
                application.getAmount(),
                application.getDisbursedAmount() != null ? application.getDisbursedAmount() : application.getAmount(),
                application.getDisbursedAmount(),
                application.getDisbursedAt(),
                application.getDisbursedBy(),
                application.getTenure(),
                loanType.getInterestRate(),
                application.getStatus(),
                schedule
        );
    }

    private void validateLoanAmountAndTenure(LoanType loan, BigDecimal amount, Integer tenure) {
        if (amount == null || tenure == null) {
            throw new ResponseStatusException(BAD_REQUEST, "Amount and tenure are required");
        }

        if (amount.compareTo(loan.getMinAmount()) < 0 || amount.compareTo(loan.getMaxAmount()) > 0) {
            throw new ResponseStatusException(BAD_REQUEST, "Invalid loan amount");
        }

        if (tenure < loan.getMinTenure() || tenure > loan.getMaxTenure()) {
            throw new ResponseStatusException(BAD_REQUEST, "Invalid loan tenure");
        }
    }

    private void validateDynamicApplicationData(String loanTypeId, Map<String, Object> applicationData) {
        if (applicationData == null) {
            applicationData = new HashMap<>();
        }

        // Loan-specific validation only (no common KYC validation here)
        // Common KYC is already validated separately

        // Personal Loan
        if ("PERSONAL_LOAN".equals(loanTypeId)) {
            if (applicationData.get("loanPurpose") == null ||
                    String.valueOf(applicationData.get("loanPurpose")).trim().isEmpty()) {
                throw new ResponseStatusException(BAD_REQUEST, "Purpose of loan is required");
            }
        }

        // Home Loan
        if ("HOME_LOAN".equals(loanTypeId)) {
            if (applicationData.get("propertyAddress") == null ||
                    String.valueOf(applicationData.get("propertyAddress")).trim().isEmpty()) {
                throw new ResponseStatusException(BAD_REQUEST, "Property address is required");
            }
            if (applicationData.get("propertyType") == null ||
                    String.valueOf(applicationData.get("propertyType")).trim().isEmpty()) {
                throw new ResponseStatusException(BAD_REQUEST, "Property type is required");
            }
        }

        // Business Loan
        if ("BUSINESS_LOAN".equals(loanTypeId)) {
            if (applicationData.get("businessName") == null ||
                    String.valueOf(applicationData.get("businessName")).trim().isEmpty()) {
                throw new ResponseStatusException(BAD_REQUEST, "Business name is required");
            }
            if (applicationData.get("businessType") == null ||
                    String.valueOf(applicationData.get("businessType")).trim().isEmpty()) {
                throw new ResponseStatusException(BAD_REQUEST, "Business type is required");
            }
            if (applicationData.get("businessPan") == null) {
                throw new ResponseStatusException(BAD_REQUEST, "Business PAN is required");
            }
        }

        // Education Loan
        if ("EDUCATION_LOAN".equals(loanTypeId)) {
            if (applicationData.get("studentName") == null ||
                    String.valueOf(applicationData.get("studentName")).trim().isEmpty()) {
                throw new ResponseStatusException(BAD_REQUEST, "Student name is required");
            }
            if (applicationData.get("courseName") == null ||
                    String.valueOf(applicationData.get("courseName")).trim().isEmpty()) {
                throw new ResponseStatusException(BAD_REQUEST, "Course name is required");
            }
            if (applicationData.get("universityDetails") == null ||
                    String.valueOf(applicationData.get("universityDetails")).trim().isEmpty()) {
                throw new ResponseStatusException(BAD_REQUEST, "University/College details are required");
            }
            if (applicationData.get("coApplicantName") == null ||
                    String.valueOf(applicationData.get("coApplicantName")).trim().isEmpty()) {
                throw new ResponseStatusException(BAD_REQUEST, "Co-applicant name is required");
            }
        }
    }

    private String hashRequest(ApplyLoanRequest request) {
        try {
            ObjectMapper mapper = new ObjectMapper();
            String json = mapper.writeValueAsString(request);
            return DigestUtils.sha256Hex(json);
        } catch (Exception e) {
            throw new RuntimeException("Failed to hash request");
        }
    }

    private String serializeResponse(ApplyLoanResponse response) {
        try {
            ObjectMapper mapper = new ObjectMapper();
            return mapper.writeValueAsString(response);
        } catch (Exception e) {
            throw new RuntimeException("Serialization failed");
        }
    }

    private ApplyLoanResponse deserializeResponse(String json) {
        if (json == null || json.isBlank()) {
            throw new RuntimeException("Deserialization failed: empty response body");
        }

        try {
            ObjectMapper mapper = new ObjectMapper();
            return mapper.readValue(json, ApplyLoanResponse.class);
        } catch (Exception e) {
            // Backward compatibility for legacy idempotency rows that stored only applicationId text.
            String normalized = json.trim();
            if (normalized.startsWith("\"") && normalized.endsWith("\"") && normalized.length() >= 2) {
                normalized = normalized.substring(1, normalized.length() - 1);
            }

            if (ObjectId.isValid(normalized)) {
                return new ApplyLoanResponse(normalized, "Loan application submitted successfully");
            }

            throw new RuntimeException("Deserialization failed", e);
        }
    }


    private List<RepaymentScheduleItem> generateRepaymentSchedule(
            BigDecimal principal,
            double annualInterestRate,
            int tenureMonths,
            LocalDate disbursedDate
    ) {
        List<RepaymentScheduleItem> schedule = new ArrayList<>();
        double monthlyRate = annualInterestRate / 12 / 100;
        BigDecimal remainingPrincipal = principal;
        MathContext mc = new MathContext(10, RoundingMode.HALF_UP);

        // EMI formula
        BigDecimal emi = principal.multiply(
                BigDecimal.valueOf(monthlyRate)
                        .multiply(BigDecimal.valueOf(Math.pow(1 + monthlyRate, tenureMonths)))
                        .divide(BigDecimal.valueOf(Math.pow(1 + monthlyRate, tenureMonths) - 1), mc),
                mc
        );

        for (int i = 1; i <= tenureMonths; i++) {
            BigDecimal interest = remainingPrincipal.multiply(BigDecimal.valueOf(monthlyRate), mc);
            BigDecimal principalPaid = emi.subtract(interest, mc);
            remainingPrincipal = remainingPrincipal.subtract(principalPaid, mc);

            schedule.add(new RepaymentScheduleItem(
                    i,
                    disbursedDate.plusMonths(i).toString(),            // dueDate as String
                    emi.setScale(2, RoundingMode.HALF_UP),           // amount
                    principalPaid.setScale(2, RoundingMode.HALF_UP), // principalAmount
                    interest.setScale(2, RoundingMode.HALF_UP),      // interestAmount
                    emi.setScale(2, RoundingMode.HALF_UP),           // totalPayment
                    remainingPrincipal.max(BigDecimal.ZERO)
                            .setScale(2, RoundingMode.HALF_UP),      // balanceAmount
                    "PENDING"                                        // default status
            ));
        }

        return schedule;
    }

}
