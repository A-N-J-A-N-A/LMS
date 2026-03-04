package com.lms.loanmanagementsystem.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class StripePaymentIntentRequest {
    private String applicationId;
    private Integer installmentNo;
    private BigDecimal amount;
    private String currency;
}
