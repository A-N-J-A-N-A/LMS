package com.lms.loanmanagementsystem.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

@Data
@AllArgsConstructor
public class AdminAnalyticsSummaryResponse {
    private long totalSessions;
    private long totalEvents;
    private List<PageDropOffMetric> topDropOffPages;
    private List<PagePerformanceMetric> pagePerformance;
}
