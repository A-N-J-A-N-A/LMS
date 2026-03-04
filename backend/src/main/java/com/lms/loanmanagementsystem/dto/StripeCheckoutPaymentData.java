package com.lms.loanmanagementsystem.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class StripeCheckoutPaymentData {
    private String paymentType;
    private String applicationId;
    private Integer installmentNo;
    private String prepaymentRequestId;
    private BigDecimal amount;
    private String paymentIntentId;
}
