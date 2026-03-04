package com.lms.loanmanagementsystem.repository;

import com.lms.loanmanagementsystem.model.ForeclosureRequest;
import com.lms.loanmanagementsystem.model.ForeclosureRequestStatus;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface ForeclosureRequestRepository extends MongoRepository<ForeclosureRequest, String> {
    boolean existsByUserIdAndLoanApplicationIdAndStatus(
            String userId,
            String loanApplicationId,
            ForeclosureRequestStatus status
    );

    List<ForeclosureRequest> findByUserIdAndLoanApplicationIdAndStatusOrderByReviewedAtDesc(
            String userId,
            String loanApplicationId,
            ForeclosureRequestStatus status
    );

    List<ForeclosureRequest> findByUserIdAndLoanApplicationIdOrderByRequestedAtDesc(
            String userId,
            String loanApplicationId
    );

    List<ForeclosureRequest> findByUserIdOrderByRequestedAtDesc(String userId);

    List<ForeclosureRequest> findAllByOrderByRequestedAtDesc();

    List<ForeclosureRequest> findByStatusOrderByRequestedAtDesc(ForeclosureRequestStatus status);
}
