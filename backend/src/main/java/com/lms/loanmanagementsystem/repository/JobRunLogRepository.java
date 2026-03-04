package com.lms.loanmanagementsystem.repository;

import com.lms.loanmanagementsystem.model.JobRunLog;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface JobRunLogRepository extends MongoRepository<JobRunLog, String> {
}
