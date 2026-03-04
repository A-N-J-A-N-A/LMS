package com.lms.loanmanagementsystem.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class PrepaymentRequestCreateRequest {
    private String loanApplicationId;
    private BigDecimal requestedAmount;
    private String reason;
}
