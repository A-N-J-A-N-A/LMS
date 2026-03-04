package com.lms.loanmanagementsystem.repository;
import com.lms.loanmanagementsystem.model.LoanApplication;
import com.lms.loanmanagementsystem.model.LoanStatus;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface LoanApplicationRepository extends MongoRepository<LoanApplication, String> {

    List<LoanApplication> findByUserId(String userId);

    List<LoanApplication> findByStatus(LoanStatus status);

    List<LoanApplication> findByStatusIn(List<LoanStatus> statuses);

    long countByStatus(LoanStatus status);

    boolean existsByUserIdAndLoanTypeIdAndStatus(
            String userId,
            String loanTypeId,
            LoanStatus status
    );

    boolean existsByUserIdAndLoanTypeIdAndStatusIn(
            String userId,
            String loanTypeId,
            List<LoanStatus> statuses
    );

    boolean existsByUserIdAndLoanTypeIdAndStatusInAndIdNot(
            String userId,
            String loanTypeId,
            List<LoanStatus> statuses,
            String id
    );


    List<LoanApplication> findByUserIdAndStatusIn(
            String userId,
            List<String> statuses
    );
}
