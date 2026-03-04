package com.lms.loanmanagementsystem.controller;

import com.lms.loanmanagementsystem.dto.AppNotificationResponse;
import com.lms.loanmanagementsystem.dto.UnreadNotificationCountResponse;
import com.lms.loanmanagementsystem.service.AppNotificationService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminNotificationControllerTest {

    @Mock
    private AppNotificationService appNotificationService;

    @InjectMocks
    private AdminNotificationController adminNotificationController;

    @Mock
    private Authentication authentication;

    @Test
    void shouldGetMyNotifications() {
        List<AppNotificationResponse> notifications =
                List.of(org.mockito.Mockito.mock(AppNotificationResponse.class));
        when(authentication.getName()).thenReturn("admin-1");
        when(appNotificationService.getMyNotifications("admin-1")).thenReturn(notifications);

        List<AppNotificationResponse> actual = adminNotificationController.getMyNotifications(authentication);

        assertSame(notifications, actual);
        verify(appNotificationService).getMyNotifications("admin-1");
    }

    @Test
    void shouldGetUnreadCount() {
        when(authentication.getName()).thenReturn("admin-1");
        when(appNotificationService.getMyUnreadCount("admin-1")).thenReturn(4L);

        UnreadNotificationCountResponse actual = adminNotificationController.getUnreadCount(authentication);

        assertEquals(4L, actual.getUnreadCount());
        verify(appNotificationService).getMyUnreadCount("admin-1");
    }

    @Test
    void shouldMarkNotificationAsRead() {
        AppNotificationResponse response = org.mockito.Mockito.mock(AppNotificationResponse.class);
        when(authentication.getName()).thenReturn("admin-1");
        when(appNotificationService.markAsRead("admin-1", "n-1")).thenReturn(response);

        AppNotificationResponse actual = adminNotificationController.markAsRead("n-1", authentication);

        assertSame(response, actual);
        verify(appNotificationService).markAsRead("admin-1", "n-1");
    }

    @Test
    void shouldMarkAllAsRead() {
        when(authentication.getName()).thenReturn("admin-1");

        adminNotificationController.markAllAsRead(authentication);

        verify(appNotificationService).markAllAsRead("admin-1");
    }
}
