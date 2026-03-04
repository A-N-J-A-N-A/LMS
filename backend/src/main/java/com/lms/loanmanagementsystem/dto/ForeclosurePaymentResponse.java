package com.lms.loanmanagementsystem.dto;

import com.lms.loanmanagementsystem.model.LoanStatus;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;

@Data
@AllArgsConstructor
public class ForeclosurePaymentResponse {
    private String message;
    private String applicationId;
    private BigDecimal amountPaid;
    private BigDecimal amountAppliedToLoan;
    private BigDecimal walletDebited;
    private BigDecimal walletCredited;
    private BigDecimal walletBalanceAfter;
    private LoanStatus loanStatus;
}
