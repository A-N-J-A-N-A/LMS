package com.lms.loanmanagementsystem.repository;

import com.lms.loanmanagementsystem.model.PrepaymentRequest;
import com.lms.loanmanagementsystem.model.PrepaymentRequestStatus;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface PrepaymentRequestRepository extends MongoRepository<PrepaymentRequest, String> {

    List<PrepaymentRequest> findByStatusOrderByRequestedAtDesc(PrepaymentRequestStatus status);

    List<PrepaymentRequest> findAllByOrderByRequestedAtDesc();

    List<PrepaymentRequest> findByUserIdOrderByRequestedAtDesc(String userId);

    List<PrepaymentRequest> findByUserIdAndLoanApplicationIdOrderByRequestedAtDesc(String userId, String loanApplicationId);
    List<PrepaymentRequest> findByUserIdAndLoanApplicationIdAndStatusOrderByReviewedAtDesc(
            String userId,
            String loanApplicationId,
            PrepaymentRequestStatus status
    );

    boolean existsByUserIdAndLoanApplicationIdAndStatus(
            String userId,
            String loanApplicationId,
            PrepaymentRequestStatus status
    );
}
