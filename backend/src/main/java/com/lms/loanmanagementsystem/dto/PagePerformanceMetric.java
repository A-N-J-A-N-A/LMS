package com.lms.loanmanagementsystem.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class PagePerformanceMetric {
    private String pagePath;
    private double avgLcpMs;
    private double avgInpMs;
    private double avgCls;
    private double avgTtfbMs;
    private double apiErrorRate;
}
