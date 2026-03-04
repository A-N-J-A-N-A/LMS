package com.lms.loanmanagementsystem.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class ForeclosurePaymentRequest {
    private String applicationId;
    private BigDecimal amount;
    private Boolean useWallet;
}
