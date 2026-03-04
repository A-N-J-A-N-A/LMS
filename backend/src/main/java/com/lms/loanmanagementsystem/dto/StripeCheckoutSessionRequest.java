package com.lms.loanmanagementsystem.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class StripeCheckoutSessionRequest {
    private String applicationId;
    private Integer installmentNo;
    private BigDecimal amount;
    private String currency;
    private String customerEmail;
}
