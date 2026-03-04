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
class UserNotificationControllerTest {

    @Mock
    private AppNotificationService appNotificationService;

    @InjectMocks
    private UserNotificationController userNotificationController;

    @Mock
    private Authentication authentication;

    @Test
    void shouldGetMyNotifications() {
        List<AppNotificationResponse> notifications =
                List.of(org.mockito.Mockito.mock(AppNotificationResponse.class));
        when(authentication.getName()).thenReturn("user-1");
        when(appNotificationService.getMyNotifications("user-1")).thenReturn(notifications);

        List<AppNotificationResponse> actual = userNotificationController.getMyNotifications(authentication);

        assertSame(notifications, actual);
        verify(appNotificationService).getMyNotifications("user-1");
    }

    @Test
    void shouldGetUnreadCount() {
        when(authentication.getName()).thenReturn("user-1");
        when(appNotificationService.getMyUnreadCount("user-1")).thenReturn(3L);

        UnreadNotificationCountResponse actual = userNotificationController.getUnreadCount(authentication);

        assertEquals(3L, actual.getUnreadCount());
        verify(appNotificationService).getMyUnreadCount("user-1");
    }

    @Test
    void shouldMarkNotificationAsRead() {
        AppNotificationResponse response = org.mockito.Mockito.mock(AppNotificationResponse.class);
        when(authentication.getName()).thenReturn("user-1");
        when(appNotificationService.markAsRead("user-1", "n-1")).thenReturn(response);

        AppNotificationResponse actual = userNotificationController.markAsRead("n-1", authentication);

        assertSame(response, actual);
        verify(appNotificationService).markAsRead("user-1", "n-1");
    }

    @Test
    void shouldMarkAllAsRead() {
        when(authentication.getName()).thenReturn("user-1");

        userNotificationController.markAllAsRead(authentication);

        verify(appNotificationService).markAllAsRead("user-1");
    }
}
