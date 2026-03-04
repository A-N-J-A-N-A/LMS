package com.lms.loanmanagementsystem.service;

import com.lms.loanmanagementsystem.dto.ForeclosureRequestCreateRequest;
import com.lms.loanmanagementsystem.dto.ForeclosureRequestResponse;
import com.lms.loanmanagementsystem.dto.PrepaymentReviewRequest;
import com.lms.loanmanagementsystem.dto.RepaymentScheduleItem;
import com.lms.loanmanagementsystem.model.ForeclosureRequest;
import com.lms.loanmanagementsystem.model.ForeclosureRequestStatus;
import com.lms.loanmanagementsystem.model.LoanApplication;
import com.lms.loanmanagementsystem.model.LoanStatus;
import com.lms.loanmanagementsystem.model.RepaymentScheduleDoc;
import com.lms.loanmanagementsystem.repository.ForeclosureRequestRepository;
import com.lms.loanmanagementsystem.repository.LoanApplicationRepository;
import com.lms.loanmanagementsystem.repository.RepaymentScheduleRepository;
import com.lms.loanmanagementsystem.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.bson.types.ObjectId;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.FORBIDDEN;
import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
@RequiredArgsConstructor
public class ForeclosureRequestService {

    private final ForeclosureRequestRepository foreclosureRequestRepository;
    private final LoanApplicationRepository loanApplicationRepository;
    private final RepaymentScheduleRepository repaymentScheduleRepository;
    private final UserRepository userRepository;
    private final AppNotificationService appNotificationService;

    public ForeclosureRequestResponse createRequest(String userId, ForeclosureRequestCreateRequest request) {
        if (request == null || request.getLoanApplicationId() == null || request.getLoanApplicationId().isBlank()) {
            throw new ResponseStatusException(BAD_REQUEST, "Loan application id is required");
        }
        if (!ObjectId.isValid(request.getLoanApplicationId())) {
            throw new ResponseStatusException(BAD_REQUEST, "Invalid loan application id");
        }
        if (request.getRequestedAmount() == null || request.getRequestedAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new ResponseStatusException(BAD_REQUEST, "Requested amount must be greater than 0");
        }

        LoanApplication application = loanApplicationRepository.findById(request.getLoanApplicationId())
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Loan application not found"));
        if (!userId.equals(application.getUserId())) {
            throw new ResponseStatusException(FORBIDDEN, "Unauthorized loan access");
        }
        if (!(application.getStatus() == LoanStatus.DISBURSED || application.getStatus() == LoanStatus.ACTIVE)) {
            throw new ResponseStatusException(BAD_REQUEST, "Foreclosure request is allowed only for active/disbursed loans");
        }

        RepaymentScheduleDoc activeSchedule = repaymentScheduleRepository
                .findByLoanApplicationIdAndStatus(application.getId(), "ACTIVE")
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Active schedule not found"));
        BigDecimal remainingPayable = getRemainingPayable(activeSchedule.getItems());
        if (remainingPayable.compareTo(BigDecimal.ZERO) <= 0) {
            throw new ResponseStatusException(BAD_REQUEST, "No outstanding payable amount");
        }
        if (request.getRequestedAmount().compareTo(remainingPayable) < 0) {
            throw new ResponseStatusException(
                    BAD_REQUEST,
                    "Requested amount cannot be less than foreclosure payable amount: " + remainingPayable
            );
        }

        boolean alreadyPending = foreclosureRequestRepository.existsByUserIdAndLoanApplicationIdAndStatus(
                userId, request.getLoanApplicationId(), ForeclosureRequestStatus.PENDING
        );
        if (alreadyPending) {
            throw new ResponseStatusException(BAD_REQUEST, "A foreclosure request is already pending for this loan");
        }

        boolean alreadyApprovedAndUnconsumed = foreclosureRequestRepository
                .findByUserIdAndLoanApplicationIdAndStatusOrderByReviewedAtDesc(
                        userId, request.getLoanApplicationId(), ForeclosureRequestStatus.APPROVED
                )
                .stream()
                .anyMatch(r -> !Boolean.TRUE.equals(r.getConsumed()));
        if (alreadyApprovedAndUnconsumed) {
            throw new ResponseStatusException(BAD_REQUEST, "An approved foreclosure request is already active for this loan");
        }

        ForeclosureRequest created = foreclosureRequestRepository.save(
                ForeclosureRequest.builder()
                        .loanApplicationId(request.getLoanApplicationId())
                        .userId(userId)
                        .requestedAmount(request.getRequestedAmount())
                        .reason(request.getReason())
                        .status(ForeclosureRequestStatus.PENDING)
                        .consumed(false)
                        .requestedAt(LocalDateTime.now())
                        .build()
        );

        appNotificationService.notifyAdmins(
                "New Foreclosure Request",
                "A new foreclosure request was submitted for application " + request.getLoanApplicationId() + ".",
                "FORECLOSURE_REQUEST_SUBMITTED",
                request.getLoanApplicationId()
        );

        return map(created);
    }

    public List<ForeclosureRequestResponse> getUserRequests(String userId, String loanApplicationId) {
        List<ForeclosureRequest> requests;
        if (loanApplicationId != null && !loanApplicationId.isBlank()) {
            requests = foreclosureRequestRepository.findByUserIdAndLoanApplicationIdOrderByRequestedAtDesc(userId, loanApplicationId);
        } else {
            requests = foreclosureRequestRepository.findByUserIdOrderByRequestedAtDesc(userId);
        }
        return requests.stream().map(this::map).toList();
    }

    public List<ForeclosureRequestResponse> getAllRequests(ForeclosureRequestStatus status) {
        List<ForeclosureRequest> requests = status == null
                ? foreclosureRequestRepository.findAllByOrderByRequestedAtDesc()
                : foreclosureRequestRepository.findByStatusOrderByRequestedAtDesc(status);
        return requests.stream().map(this::map).toList();
    }

    public ForeclosureRequestResponse reviewRequest(String requestId, String adminId, PrepaymentReviewRequest review) {
        if (review == null) {
            throw new ResponseStatusException(BAD_REQUEST, "Review payload is required");
        }
        if (!ObjectId.isValid(requestId)) {
            throw new ResponseStatusException(BAD_REQUEST, "Invalid request id");
        }

        ForeclosureRequest existing = foreclosureRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Foreclosure request not found"));
        if (existing.getStatus() != ForeclosureRequestStatus.PENDING) {
            throw new ResponseStatusException(BAD_REQUEST, "Request already reviewed");
        }

        existing.setStatus(review.isApprove() ? ForeclosureRequestStatus.APPROVED : ForeclosureRequestStatus.REJECTED);
        existing.setReviewedBy(adminId);
        existing.setReviewComment(review.getComment());
        existing.setReviewedAt(LocalDateTime.now());
        ForeclosureRequest saved = foreclosureRequestRepository.save(existing);

        appNotificationService.notifyUser(
                existing.getUserId(),
                "Foreclosure Request " + saved.getStatus(),
                "Your foreclosure request for application " + existing.getLoanApplicationId() +
                        " has been " + saved.getStatus().name().toLowerCase() + ".",
                saved.getStatus() == ForeclosureRequestStatus.APPROVED ? "FORECLOSURE_APPROVED" : "FORECLOSURE_REJECTED",
                existing.getLoanApplicationId()
        );

        return map(saved);
    }

    public ForeclosureRequest getApprovedUnconsumedRequest(String userId, String loanApplicationId) {
        return foreclosureRequestRepository
                .findByUserIdAndLoanApplicationIdAndStatusOrderByReviewedAtDesc(
                        userId, loanApplicationId, ForeclosureRequestStatus.APPROVED
                )
                .stream()
                .filter(r -> !Boolean.TRUE.equals(r.getConsumed()))
                .findFirst()
                .orElse(null);
    }

    public void markConsumed(ForeclosureRequest request, String paymentId) {
        if (request == null) return;
        request.setConsumed(true);
        request.setConsumedAt(LocalDateTime.now());
        request.setConsumedByPaymentId(paymentId);
        foreclosureRequestRepository.save(request);
    }

    private BigDecimal getRemainingPayable(List<RepaymentScheduleItem> items) {
        if (items == null || items.isEmpty()) {
            return BigDecimal.ZERO;
        }
        return items.stream()
                .filter(i -> i.getStatus() == null || !"paid".equalsIgnoreCase(i.getStatus()))
                .map(i -> {
                    BigDecimal total = i.getTotalPayment() == null ? BigDecimal.ZERO : i.getTotalPayment();
                    return total.compareTo(BigDecimal.ZERO) > 0
                            ? total
                            : (i.getAmount() == null ? BigDecimal.ZERO : i.getAmount());
                })
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private ForeclosureRequestResponse map(ForeclosureRequest foreclosureRequest) {
        String customerName = userRepository.findById(foreclosureRequest.getUserId())
                .map(user -> user.getFullName())
                .orElse("Unknown User");
        return new ForeclosureRequestResponse(
                foreclosureRequest.getId(),
                foreclosureRequest.getLoanApplicationId(),
                foreclosureRequest.getUserId(),
                customerName,
                foreclosureRequest.getRequestedAmount(),
                foreclosureRequest.getReason(),
                foreclosureRequest.getStatus(),
                foreclosureRequest.getRequestedAt(),
                foreclosureRequest.getReviewedAt(),
                foreclosureRequest.getReviewedBy(),
                foreclosureRequest.getReviewComment(),
                foreclosureRequest.getConsumed(),
                foreclosureRequest.getConsumedAt()
        );
    }
}
