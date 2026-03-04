package com.lms.loanmanagementsystem.service;

import com.lms.loanmanagementsystem.dto.AppNotificationResponse;
import com.lms.loanmanagementsystem.model.AppNotification;
import com.lms.loanmanagementsystem.model.User;
import com.lms.loanmanagementsystem.repository.AppNotificationRepository;
import com.lms.loanmanagementsystem.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.bson.types.ObjectId;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.FORBIDDEN;
import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
@RequiredArgsConstructor
public class AppNotificationService {

    private final AppNotificationRepository appNotificationRepository;
    private final UserRepository userRepository;

    public void notifyUser(
            String userId,
            String title,
            String message,
            String type,
            String relatedEntityId
    ) {
        String normalizedRecipient = resolveRecipientUserId(userId);
        AppNotification notification = AppNotification.builder()
                .recipientUserId(normalizedRecipient)
                .recipientRole("USER")
                .title(title)
                .message(message)
                .type(type)
                .relatedEntityId(relatedEntityId)
                .read(false)
                .createdAt(LocalDateTime.now())
                .build();

        appNotificationRepository.save(notification);
    }

    public void notifyAdmins(
            String title,
            String message,
            String type,
            String relatedEntityId
    ) {
        List<User> admins = userRepository.findByRole("ADMIN");
        if (admins.isEmpty()) {
            return;
        }

        List<AppNotification> notifications = admins.stream()
                .map(admin -> AppNotification.builder()
                        .recipientUserId(admin.getId())
                        .recipientRole("ADMIN")
                        .title(title)
                        .message(message)
                        .type(type)
                        .relatedEntityId(relatedEntityId)
                        .read(false)
                        .createdAt(LocalDateTime.now())
                        .build())
                .toList();

        appNotificationRepository.saveAll(notifications);
    }

    public List<AppNotificationResponse> getMyNotifications(String userId) {
        List<String> recipientKeys = getRecipientKeys(userId);
        return appNotificationRepository.findByRecipientUserIdInOrderByCreatedAtDesc(recipientKeys)
                .stream()
                .map(this::map)
                .toList();
    }

    public long getMyUnreadCount(String userId) {
        return appNotificationRepository.countByRecipientUserIdInAndReadFalse(getRecipientKeys(userId));
    }

    public AppNotificationResponse markAsRead(String userId, String notificationId) {
        if (!ObjectId.isValid(notificationId)) {
            throw new ResponseStatusException(BAD_REQUEST, "Invalid notification id");
        }

        AppNotification notification = appNotificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Notification not found"));

        List<String> recipientKeys = getRecipientKeys(userId);
        if (!recipientKeys.contains(notification.getRecipientUserId())) {
            throw new ResponseStatusException(FORBIDDEN, "Unauthorized notification access");
        }

        if (!notification.isRead()) {
            notification.setRead(true);
            notification.setReadAt(LocalDateTime.now());
            notification = appNotificationRepository.save(notification);
        }

        return map(notification);
    }

    public void markAllAsRead(String userId) {
        List<AppNotification> notifications =
                appNotificationRepository.findByRecipientUserIdInOrderByCreatedAtDesc(getRecipientKeys(userId));
        boolean changed = false;
        for (AppNotification n : notifications) {
            if (!n.isRead()) {
                n.setRead(true);
                n.setReadAt(LocalDateTime.now());
                changed = true;
            }
        }
        if (changed) {
            appNotificationRepository.saveAll(notifications);
        }
    }

    private AppNotificationResponse map(AppNotification notification) {
        return new AppNotificationResponse(
                notification.getId(),
                notification.getTitle(),
                notification.getMessage(),
                notification.getType(),
                notification.getRelatedEntityId(),
                notification.isRead(),
                notification.getCreatedAt(),
                notification.getReadAt()
        );
    }

    private String resolveRecipientUserId(String raw) {
        if (raw == null || raw.isBlank()) {
            return raw;
        }

        if (ObjectId.isValid(raw) && userRepository.findById(raw).isPresent()) {
            return raw;
        }

        return userRepository.findByEmail(raw)
                .map(User::getId)
                .orElse(raw);
    }

    private List<String> getRecipientKeys(String userId) {
        List<String> keys = new ArrayList<>();
        if (userId == null || userId.isBlank()) {
            return keys;
        }

        keys.add(userId);

        if (ObjectId.isValid(userId)) {
            userRepository.findById(userId).ifPresent(user -> {
                if (user.getEmail() != null && !user.getEmail().isBlank()) {
                    keys.add(user.getEmail());
                }
            });
        } else {
            userRepository.findByEmail(userId).ifPresent(user -> {
                if (user.getId() != null && !user.getId().isBlank()) {
                    keys.add(user.getId());
                }
            });
        }

        return keys.stream().distinct().toList();
    }
}
