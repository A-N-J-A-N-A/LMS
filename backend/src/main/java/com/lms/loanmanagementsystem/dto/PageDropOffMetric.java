package com.lms.loanmanagementsystem.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class PageDropOffMetric {
    private String pagePath;
    private long visits;
    private long exits;
    private double dropOffRate;
    private double avgTimeOnPageSeconds;
    private String suspectedReason;
}
