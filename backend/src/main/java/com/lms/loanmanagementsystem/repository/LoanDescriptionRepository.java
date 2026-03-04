package com.lms.loanmanagementsystem.repository;

import com.lms.loanmanagementsystem.model.LoanDescription;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface LoanDescriptionRepository
        extends MongoRepository<LoanDescription, String> {

    Optional<LoanDescription> findByLoanTypeId(String loanTypeId);
}
