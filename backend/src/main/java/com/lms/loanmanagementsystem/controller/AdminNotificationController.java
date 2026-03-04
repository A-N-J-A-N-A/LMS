package com.lms.loanmanagementsystem.controller;

import com.lms.loanmanagementsystem.dto.AppNotificationResponse;
import com.lms.loanmanagementsystem.dto.UnreadNotificationCountResponse;
import com.lms.loanmanagementsystem.service.AppNotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/admin/notifications-feed")
@RequiredArgsConstructor
@CrossOrigin
public class AdminNotificationController {

    private final AppNotificationService appNotificationService;

    @GetMapping
    public List<AppNotificationResponse> getMyNotifications(Authentication authentication) {
        return appNotificationService.getMyNotifications(authentication.getName());
    }

    @GetMapping("/unread-count")
    public UnreadNotificationCountResponse getUnreadCount(Authentication authentication) {
        long count = appNotificationService.getMyUnreadCount(authentication.getName());
        return new UnreadNotificationCountResponse(count);
    }

    @PutMapping("/{id}/read")
    public AppNotificationResponse markAsRead(
            @PathVariable String id,
            Authentication authentication
    ) {
        return appNotificationService.markAsRead(authentication.getName(), id);
    }

    @PutMapping("/read-all")
    public void markAllAsRead(Authentication authentication) {
        appNotificationService.markAllAsRead(authentication.getName());
    }
}
