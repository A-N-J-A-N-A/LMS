package com.lms.loanmanagementsystem.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class PaymentRequest {
    private String applicationId;
    private Integer installmentNo;
    private BigDecimal amount;
    private String paymentIntentId;
    private Boolean useWallet;
}
