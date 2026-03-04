package com.lms.loanmanagementsystem.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;

@Data
@AllArgsConstructor
public class AdminDashboardStatsResponse {

    private long totalApplications;
    private long pending;
    private long approved;
    private long rejected;

    private long totalLoansIssued;
    private long activeLoans;
    private long closedLoans;
    private long defaultedNpaLoans;
    private long totalCustomers;

    private BigDecimal totalAmountDisbursed;
    private BigDecimal totalOutstandingPrincipal;
    private BigDecimal emiCollectedToday;
    private BigDecimal emiCollectedThisMonth;
    private BigDecimal overdueAmount;
    private BigDecimal prepaymentAmount;
    private BigDecimal excessPaymentAmount;

    private long pendingApplications;
    private long approvedApplications;
    private long rejectedApplications;
    private long approvedButNotDisbursedLoans;

    private long upcomingEmisNext7Days;
    private long upcomingEmisNext30Days;
    private long onTimePayments;
    private long latePayments;
    private long missedEmis;
    private BigDecimal penaltyLateFeeGeneratedAmount;
    private long penaltyLateFeeGeneratedCount;
}
