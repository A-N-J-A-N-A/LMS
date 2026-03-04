package com.lms.loanmanagementsystem.repository;

import com.lms.loanmanagementsystem.model.LoanType;
import org.bson.types.ObjectId;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface LoanTypeRepository extends MongoRepository<LoanType, String> {

    List<LoanType> findByStatus(String status);

    Optional<LoanType> findByIdAndStatus(String id, String status);

}