package com.lms.loanmanagementsystem.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;

@Data
@AllArgsConstructor
public class PaymentSummaryResponse {
    private BigDecimal disbursedAmount;

    private BigDecimal totalPaid;
    private BigDecimal principalPaid;
    private BigDecimal interestPaid;
    private BigDecimal penaltyPaid;

    private BigDecimal remainingScheduledAmount; // sum of unpaid installments
    private BigDecimal outstandingPrincipal;     // disbursed - principalPaid
}
