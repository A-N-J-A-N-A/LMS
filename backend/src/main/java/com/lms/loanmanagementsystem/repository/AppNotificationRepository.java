package com.lms.loanmanagementsystem.repository;

import com.lms.loanmanagementsystem.model.AppNotification;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface AppNotificationRepository extends MongoRepository<AppNotification, String> {

    List<AppNotification> findByRecipientUserIdOrderByCreatedAtDesc(String recipientUserId);
    List<AppNotification> findByRecipientUserIdInOrderByCreatedAtDesc(List<String> recipientUserIds);

    long countByRecipientUserIdAndReadFalse(String recipientUserId);
    long countByRecipientUserIdInAndReadFalse(List<String> recipientUserIds);
}
