package com.lms.loanmanagementsystem.repository;

import com.lms.loanmanagementsystem.model.AuditLog;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface AuditLogRepository
        extends MongoRepository<AuditLog, String> {

    List<AuditLog> findByUserId(String userId);

    AuditLog findTopByOrderByAuditSequenceDesc();
}
