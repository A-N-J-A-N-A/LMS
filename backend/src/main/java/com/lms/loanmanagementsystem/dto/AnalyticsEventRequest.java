package com.lms.loanmanagementsystem.dto;

import com.lms.loanmanagementsystem.model.AnalyticsEventType;
import lombok.Data;

import java.util.Map;

@Data
public class AnalyticsEventRequest {
    private String sessionId;
    private String pagePath;
    private AnalyticsEventType eventType;
    private Long durationMs;
    private Map<String, Object> metadata;
}
