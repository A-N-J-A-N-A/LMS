package com.lms.loanmanagementsystem.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.Map;

@Document(collection = "analytics_events")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AnalyticsEvent {

    @Id
    private String id;

    private String sessionId;
    private String userId;
    private String role;
    private String pagePath;
    private AnalyticsEventType eventType;
    private Long durationMs;
    private Map<String, Object> metadata;
    private LocalDateTime createdAt;
}
