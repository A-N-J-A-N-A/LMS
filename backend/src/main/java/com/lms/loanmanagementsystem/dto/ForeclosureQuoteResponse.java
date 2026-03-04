package com.lms.loanmanagementsystem.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;

@Data
@AllArgsConstructor
public class ForeclosureQuoteResponse {
    private String applicationId;
    private BigDecimal remainingPayable;
    private BigDecimal outstandingPrincipal;
    private BigDecimal walletBalance;
    private BigDecimal payableAfterWallet;
}
