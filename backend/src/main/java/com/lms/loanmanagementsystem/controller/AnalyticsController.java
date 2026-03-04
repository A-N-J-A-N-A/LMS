package com.lms.loanmanagementsystem.controller;

import com.lms.loanmanagementsystem.dto.AdminAnalyticsSummaryResponse;
import com.lms.loanmanagementsystem.dto.AnalyticsEventRequest;
import com.lms.loanmanagementsystem.service.AnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    @PostMapping("/analytics/events")
    public void trackEvent(
            @RequestBody AnalyticsEventRequest request,
            Authentication authentication
    ) {
        String userId = authentication == null ? null : authentication.getName();
        String role = null;
        if (authentication != null && authentication.getAuthorities() != null) {
            role = authentication.getAuthorities().stream()
                    .map(GrantedAuthority::getAuthority)
                    .findFirst()
                    .orElse(null);
        }
        analyticsService.trackEvent(request, userId, role);
    }

    @GetMapping("/admin/analytics/summary")
    public AdminAnalyticsSummaryResponse adminAnalyticsSummary(
            @RequestParam(defaultValue = "7") int days
    ) {
        return analyticsService.getSummary(days);
    }
}
