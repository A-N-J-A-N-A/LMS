package com.lms.loanmanagementsystem.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;

@Data
@AllArgsConstructor
public class LoanTypeProfitabilityItem {
    private String loanTypeId;
    private BigDecimal interestProfit;
    private long paymentCount;
}
