package com.lms.loanmanagementsystem.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class StripeForeclosureCheckoutSessionRequest {
    private String applicationId;
    private BigDecimal amount;
    private String currency;
    private String customerEmail;
}
