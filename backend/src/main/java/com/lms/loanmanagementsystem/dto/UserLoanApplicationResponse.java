package com.lms.loanmanagementsystem.dto;

import com.lms.loanmanagementsystem.model.LoanStatus;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class UserLoanApplicationResponse {

    private String applicationId;
    private String loanTypeId;

    private BigDecimal amount;
    private Integer tenure;

    private LoanStatus status;
    private BigDecimal disbursedAmount;
    private LocalDateTime disbursedAt;
    private LocalDateTime createdAt;
    private String reviewComment;
    private LocalDateTime reviewedAt;
}
