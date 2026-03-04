package com.lms.loanmanagementsystem.service;

import com.lms.loanmanagementsystem.dto.AdminAnalyticsSummaryResponse;
import com.lms.loanmanagementsystem.dto.AnalyticsEventRequest;
import com.lms.loanmanagementsystem.dto.PageDropOffMetric;
import com.lms.loanmanagementsystem.dto.PagePerformanceMetric;
import com.lms.loanmanagementsystem.model.AnalyticsEvent;
import com.lms.loanmanagementsystem.model.AnalyticsEventType;
import com.lms.loanmanagementsystem.repository.AnalyticsEventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private static final Set<String> ALLOWED_METRIC_NAMES = Set.of("LCP", "INP", "CLS", "TTFB");
    private final AnalyticsEventRepository analyticsEventRepository;

    public void trackEvent(AnalyticsEventRequest request, String userId, String role) {
        if (request == null || request.getEventType() == null) {
            return;
        }

        String pagePath = sanitizePath(request.getPagePath());
        if (pagePath.isBlank()) {
            return;
        }

        Map<String, Object> metadata = sanitizeMetadata(request.getMetadata(), request.getEventType());

        AnalyticsEvent event = AnalyticsEvent.builder()
                .sessionId(trimValue(request.getSessionId()))
                .userId(trimValue(userId))
                .role(trimValue(role))
                .pagePath(pagePath)
                .eventType(request.getEventType())
                .durationMs(request.getDurationMs() == null ? null : Math.max(0L, request.getDurationMs()))
                .metadata(metadata)
                .createdAt(LocalDateTime.now())
                .build();

        analyticsEventRepository.save(event);
    }

    public AdminAnalyticsSummaryResponse getSummary(int days) {
        int safeDays = Math.max(1, Math.min(days, 90));
        LocalDateTime start = LocalDateTime.now().minusDays(safeDays);
        List<AnalyticsEvent> events = analyticsEventRepository.findByCreatedAtAfter(start);

        Set<String> sessions = events.stream()
                .map(AnalyticsEvent::getSessionId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        Map<String, Long> visitsByPage = new HashMap<>();
        Map<String, Long> exitsByPage = new HashMap<>();
        Map<String, Long> durationSumByPage = new HashMap<>();
        Map<String, Long> durationCountByPage = new HashMap<>();
        Map<String, Long> apiErrorsByPage = new HashMap<>();
        Map<String, Map<String, List<Double>>> vitalsByPage = new HashMap<>();

        for (AnalyticsEvent event : events) {
            String page = sanitizePath(event.getPagePath());
            if (page.isBlank()) continue;

            if (event.getEventType() == AnalyticsEventType.PAGE_VIEW) {
                visitsByPage.merge(page, 1L, Long::sum);
            } else if (event.getEventType() == AnalyticsEventType.PAGE_EXIT) {
                exitsByPage.merge(page, 1L, Long::sum);
                if (event.getDurationMs() != null) {
                    durationSumByPage.merge(page, event.getDurationMs(), Long::sum);
                    durationCountByPage.merge(page, 1L, Long::sum);
                }
            } else if (event.getEventType() == AnalyticsEventType.API_ERROR) {
                apiErrorsByPage.merge(page, 1L, Long::sum);
            } else if (event.getEventType() == AnalyticsEventType.WEB_VITAL && event.getMetadata() != null) {
                String metricName = stringValue(event.getMetadata().get("metricName"));
                Double metricValue = doubleValue(event.getMetadata().get("value"));
                if (metricName != null && metricValue != null && ALLOWED_METRIC_NAMES.contains(metricName)) {
                    vitalsByPage
                            .computeIfAbsent(page, ignored -> new HashMap<>())
                            .computeIfAbsent(metricName, ignored -> new ArrayList<>())
                            .add(metricValue);
                }
            }
        }

        Set<String> allPages = new HashSet<>();
        allPages.addAll(visitsByPage.keySet());
        allPages.addAll(exitsByPage.keySet());
        allPages.addAll(vitalsByPage.keySet());
        allPages.addAll(apiErrorsByPage.keySet());

        List<PageDropOffMetric> dropOffMetrics = new ArrayList<>();
        List<PagePerformanceMetric> performanceMetrics = new ArrayList<>();

        for (String page : allPages) {
            long visits = visitsByPage.getOrDefault(page, 0L);
            long exits = exitsByPage.getOrDefault(page, 0L);
            double dropOffRate = visits > 0 ? round((exits * 100.0) / visits) : 0.0;

            long durationSum = durationSumByPage.getOrDefault(page, 0L);
            long durationCount = durationCountByPage.getOrDefault(page, 0L);
            double avgTimeSec = durationCount > 0 ? round((durationSum / (double) durationCount) / 1000.0) : 0.0;

            double apiErrorRate = visits > 0
                    ? round((apiErrorsByPage.getOrDefault(page, 0L) * 100.0) / visits)
                    : 0.0;

            Map<String, List<Double>> pageVitals = vitalsByPage.getOrDefault(page, Collections.emptyMap());
            double avgLcp = average(pageVitals.get("LCP"));
            double avgInp = average(pageVitals.get("INP"));
            double avgCls = average(pageVitals.get("CLS"));
            double avgTtfb = average(pageVitals.get("TTFB"));

            String suspectedReason = "Needs UX review";
            if (avgLcp > 2500 || avgInp > 200 || avgTtfb > 800) {
                suspectedReason = "Likely performance issue";
            } else if (apiErrorRate > 5) {
                suspectedReason = "Likely API error issue";
            }

            dropOffMetrics.add(new PageDropOffMetric(
                    page, visits, exits, dropOffRate, avgTimeSec, suspectedReason
            ));

            performanceMetrics.add(new PagePerformanceMetric(
                    page,
                    round(avgLcp),
                    round(avgInp),
                    round(avgCls),
                    round(avgTtfb),
                    apiErrorRate
            ));
        }

        dropOffMetrics.sort(Comparator.comparing(PageDropOffMetric::getDropOffRate).reversed());
        performanceMetrics.sort(
                Comparator.comparing((PagePerformanceMetric p) -> score(p)).reversed()
        );

        List<PageDropOffMetric> topDropOff = dropOffMetrics.stream().limit(10).toList();
        List<PagePerformanceMetric> topPerformance = performanceMetrics.stream().limit(10).toList();

        return new AdminAnalyticsSummaryResponse(
                sessions.size(),
                events.size(),
                topDropOff,
                topPerformance
        );
    }

    private double score(PagePerformanceMetric p) {
        return p.getAvgLcpMs() + p.getAvgInpMs() + (p.getAvgCls() * 1000) + p.getAvgTtfbMs() + (p.getApiErrorRate() * 10);
    }

    private Map<String, Object> sanitizeMetadata(Map<String, Object> metadata, AnalyticsEventType eventType) {
        if (metadata == null || metadata.isEmpty()) {
            return null;
        }

        Map<String, Object> sanitized = new HashMap<>();
        if (eventType == AnalyticsEventType.WEB_VITAL) {
            String metricName = stringValue(metadata.get("metricName"));
            Double value = doubleValue(metadata.get("value"));
            if (metricName != null && ALLOWED_METRIC_NAMES.contains(metricName) && value != null) {
                sanitized.put("metricName", metricName);
                sanitized.put("value", value);
            }
        }
        if (eventType == AnalyticsEventType.API_ERROR) {
            String apiPath = stringValue(metadata.get("apiPath"));
            String method = stringValue(metadata.get("method"));
            Object statusObj = metadata.get("status");
            Integer status = statusObj instanceof Number ? ((Number) statusObj).intValue() : null;
            if (apiPath != null) sanitized.put("apiPath", apiPath);
            if (method != null) sanitized.put("method", method);
            if (status != null) sanitized.put("status", status);
        }

        return sanitized.isEmpty() ? null : sanitized;
    }

    private String sanitizePath(String path) {
        if (path == null) return "";
        String trimmed = path.trim();
        if (trimmed.length() > 200) {
            trimmed = trimmed.substring(0, 200);
        }
        return trimmed;
    }

    private String trimValue(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String stringValue(Object value) {
        if (value == null) return null;
        String v = value.toString().trim();
        return v.isEmpty() ? null : v;
    }

    private Double doubleValue(Object value) {
        if (value instanceof Number) return ((Number) value).doubleValue();
        try {
            return value == null ? null : Double.parseDouble(value.toString());
        } catch (Exception ex) {
            return null;
        }
    }

    private double average(List<Double> values) {
        if (values == null || values.isEmpty()) return 0.0;
        return values.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
    }

    private double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
