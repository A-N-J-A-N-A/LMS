package com.lms.loanmanagementsystem.controller;

import com.lms.loanmanagementsystem.dto.AdminAnalyticsSummaryResponse;
import com.lms.loanmanagementsystem.dto.AnalyticsEventRequest;
import com.lms.loanmanagementsystem.model.AnalyticsEventType;
import com.lms.loanmanagementsystem.service.AnalyticsService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AnalyticsControllerTest {

    @Mock
    private AnalyticsService analyticsService;

    @InjectMocks
    private AnalyticsController analyticsController;

    @Mock
    private Authentication authentication;

    @Test
    void shouldTrackEvent() {
        AnalyticsEventRequest request = new AnalyticsEventRequest();
        request.setPagePath("/loans");
        request.setEventType(AnalyticsEventType.PAGE_VIEW);

        when(authentication.getName()).thenReturn("user-1");
        doReturn(List.of(new SimpleGrantedAuthority("ROLE_USER")))
                .when(authentication).getAuthorities();

        analyticsController.trackEvent(request, authentication);

        verify(analyticsService).trackEvent(request, "user-1", "ROLE_USER");
    }

    @Test
    void shouldGetAnalyticsSummary() {
        AdminAnalyticsSummaryResponse response = new AdminAnalyticsSummaryResponse(1L, 2L, List.of(), List.of());
        when(analyticsService.getSummary(7)).thenReturn(response);

        AdminAnalyticsSummaryResponse actual = analyticsController.adminAnalyticsSummary(7);

        assertSame(response, actual);
        verify(analyticsService).getSummary(7);
    }
}
