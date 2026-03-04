package com.lms.loanmanagementsystem.repository;

import com.lms.loanmanagementsystem.model.RepaymentScheduleDoc;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface RepaymentScheduleRepository extends MongoRepository<RepaymentScheduleDoc, String> {

    Optional<RepaymentScheduleDoc> findByLoanApplicationIdAndStatus(String loanApplicationId, String status);

    boolean existsByLoanApplicationIdAndStatus(String loanApplicationId, String status);

    Optional<RepaymentScheduleDoc> findTopByLoanApplicationIdOrderByVersionDesc(String loanApplicationId);


    boolean existsByLoanApplicationId(String id);
}
