package com.lms.loanmanagementsystem.repository;

import com.lms.loanmanagementsystem.model.AnalyticsEvent;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface AnalyticsEventRepository extends MongoRepository<AnalyticsEvent, String> {
    List<AnalyticsEvent> findByCreatedAtAfter(LocalDateTime createdAt);
}
