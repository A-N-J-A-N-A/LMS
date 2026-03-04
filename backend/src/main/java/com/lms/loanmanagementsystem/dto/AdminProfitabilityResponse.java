package com.lms.loanmanagementsystem.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AdminProfitabilityResponse {
    private BigDecimal totalInterestProfit;
    private long interestPaymentCount;
    private List<LoanTypeProfitabilityItem> byLoanType;
    private long disbursedLoanCount;
    private long closedLoanCount;
    private BigDecimal totalDisbursedAmount;
    private BigDecimal totalPaidBackAmount;
    private String mostProfitableLoanType;
    private BigDecimal mostProfitableLoanTypeProfit;

    public AdminProfitabilityResponse(BigDecimal totalInterestProfit, long interestPaymentCount) {
        this.totalInterestProfit = totalInterestProfit;
        this.interestPaymentCount = interestPaymentCount;
    }
}
