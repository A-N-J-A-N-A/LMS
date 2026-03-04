package com.lms.loanmanagementsystem.service;

import com.lms.loanmanagementsystem.dto.PrepaymentRequestCreateRequest;
import com.lms.loanmanagementsystem.dto.PrepaymentRequestResponse;
import com.lms.loanmanagementsystem.dto.PrepaymentReviewRequest;
import com.lms.loanmanagementsystem.model.LoanApplication;
import com.lms.loanmanagementsystem.model.LoanStatus;
import com.lms.loanmanagementsystem.model.PrepaymentRequest;
import com.lms.loanmanagementsystem.model.PrepaymentRequestStatus;
import com.lms.loanmanagementsystem.repository.LoanApplicationRepository;
import com.lms.loanmanagementsystem.repository.PrepaymentRequestRepository;
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
public class PrepaymentRequestService {

    private final PrepaymentRequestRepository prepaymentRequestRepository;
    private final LoanApplicationRepository loanApplicationRepository;
    private final UserRepository userRepository;
    private final AppNotificationService appNotificationService;

    public PrepaymentRequestResponse createRequest(String userId, PrepaymentRequestCreateRequest request) {
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
            throw new ResponseStatusException(BAD_REQUEST, "Prepayment request is allowed only for active/disbursed loans");
        }

        BigDecimal principal = application.getDisbursedAmount() != null
                ? application.getDisbursedAmount()
                : application.getAmount();
        if (request.getRequestedAmount().compareTo(principal) > 0) {
            throw new ResponseStatusException(BAD_REQUEST, "Requested amount cannot exceed principal amount");
        }

        boolean alreadyPending = prepaymentRequestRepository.existsByUserIdAndLoanApplicationIdAndStatus(
                userId,
                request.getLoanApplicationId(),
                PrepaymentRequestStatus.PENDING
        );
        if (alreadyPending) {
            throw new ResponseStatusException(BAD_REQUEST, "A prepayment request is already pending for this loan");
        }

        boolean alreadyApprovedAndUnconsumed = prepaymentRequestRepository
                .findByUserIdAndLoanApplicationIdAndStatusOrderByReviewedAtDesc(
                        userId,
                        request.getLoanApplicationId(),
                        PrepaymentRequestStatus.APPROVED
                )
                .stream()
                .anyMatch(r -> !Boolean.TRUE.equals(r.getConsumed()));

        if (alreadyApprovedAndUnconsumed) {
            throw new ResponseStatusException(
                    BAD_REQUEST,
                    "An approved prepayment request is already active for this loan"
            );
        }

        PrepaymentRequest created = prepaymentRequestRepository.save(
                PrepaymentRequest.builder()
                        .loanApplicationId(request.getLoanApplicationId())
                        .userId(userId)
                        .requestedAmount(request.getRequestedAmount())
                        .reason(request.getReason())
                        .status(PrepaymentRequestStatus.PENDING)
                        .consumed(false)
                        .requestedAt(LocalDateTime.now())
                        .build()
        );

        appNotificationService.notifyAdmins(
                "New Prepayment Request",
                "A new prepayment request was submitted for application " + request.getLoanApplicationId() + ".",
                "PREPAYMENT_REQUEST_SUBMITTED",
                request.getLoanApplicationId()
        );

        return map(created);
    }

    public List<PrepaymentRequestResponse> getUserRequests(String userId, String loanApplicationId) {
        List<PrepaymentRequest> requests;
        if (loanApplicationId != null && !loanApplicationId.isBlank()) {
            requests = prepaymentRequestRepository.findByUserIdAndLoanApplicationIdOrderByRequestedAtDesc(userId, loanApplicationId);
        } else {
            requests = prepaymentRequestRepository.findByUserIdOrderByRequestedAtDesc(userId);
        }
        return requests.stream().map(this::map).toList();
    }

    public List<PrepaymentRequestResponse> getAllRequests(PrepaymentRequestStatus status) {
        List<PrepaymentRequest> requests = status == null
                ? prepaymentRequestRepository.findAllByOrderByRequestedAtDesc()
                : prepaymentRequestRepository.findByStatusOrderByRequestedAtDesc(status);
        return requests.stream().map(this::map).toList();
    }

    public PrepaymentRequestResponse reviewRequest(
            String requestId,
            String adminId,
            PrepaymentReviewRequest review
    ) {
        if (review == null) {
            throw new ResponseStatusException(BAD_REQUEST, "Review payload is required");
        }
        if (!ObjectId.isValid(requestId)) {
            throw new ResponseStatusException(BAD_REQUEST, "Invalid request id");
        }

        PrepaymentRequest existing = prepaymentRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Prepayment request not found"));

        if (existing.getStatus() != PrepaymentRequestStatus.PENDING) {
            throw new ResponseStatusException(BAD_REQUEST, "Request already reviewed");
        }

        existing.setStatus(review.isApprove() ? PrepaymentRequestStatus.APPROVED : PrepaymentRequestStatus.REJECTED);
        existing.setReviewedBy(adminId);
        existing.setReviewComment(review.getComment());
        existing.setReviewedAt(LocalDateTime.now());
        PrepaymentRequest saved = prepaymentRequestRepository.save(existing);

        appNotificationService.notifyUser(
                existing.getUserId(),
                "Prepayment Request " + saved.getStatus(),
                "Your prepayment request for application " + existing.getLoanApplicationId() +
                        " has been " + saved.getStatus().name().toLowerCase() + ".",
                saved.getStatus() == PrepaymentRequestStatus.APPROVED
                        ? "PREPAYMENT_APPROVED"
                        : "PREPAYMENT_REJECTED",
                existing.getLoanApplicationId()
        );

        return map(saved);
    }

    private PrepaymentRequestResponse map(PrepaymentRequest prepaymentRequest) {
        String customerName = userRepository.findById(prepaymentRequest.getUserId())
                .map(user -> user.getFullName())
                .orElse("Unknown User");

        return new PrepaymentRequestResponse(
                prepaymentRequest.getId(),
                prepaymentRequest.getLoanApplicationId(),
                prepaymentRequest.getUserId(),
                customerName,
                prepaymentRequest.getRequestedAmount(),
                prepaymentRequest.getReason(),
                prepaymentRequest.getStatus(),
                prepaymentRequest.getRequestedAt(),
                prepaymentRequest.getReviewedAt(),
                prepaymentRequest.getReviewedBy(),
                prepaymentRequest.getReviewComment(),
                prepaymentRequest.getConsumed(),
                prepaymentRequest.getConsumedAt()
        );
    }
}
