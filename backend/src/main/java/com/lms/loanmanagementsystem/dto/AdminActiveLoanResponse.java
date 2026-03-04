package com.lms.loanmanagementsystem.dto;

import com.lms.loanmanagementsystem.model.LoanStatus;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class AdminActiveLoanResponse {

    private String applicationId;
    private String userId;
    private String customerName;
    private String loanTypeId;
    private LoanStatus status;
    private BigDecimal sanctionedAmount;
    private BigDecimal disbursedAmount;
    private Integer tenure;
    private LocalDateTime disbursedAt;
    private String nextDueDate;
    private Integer totalInstallments;
    private Integer paidInstallments;
    private BigDecimal totalPaidAmount;
    private BigDecimal outstandingAmount;
}
