package com.lms.loanmanagementsystem.repository;

import com.lms.loanmanagementsystem.model.CommonKycRequirement;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface CommonKycRepository
        extends MongoRepository<CommonKycRequirement, String> {
}
