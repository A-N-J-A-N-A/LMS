package com.lms.loanmanagementsystem.dto;

import com.lms.loanmanagementsystem.model.LoanStatus;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@AllArgsConstructor
public class AdminLoanTrackerResponse {
    private String applicationId;
    private String userId;
    private String customerName;
    private String loanTypeId;
    private LoanStatus status;
    private BigDecimal sanctionedAmount;
    private BigDecimal disbursedAmount;
    private Integer tenure;
    private Double interestRate;
    private LocalDateTime disbursedAt;
    private Integer totalInstallments;
    private Integer paidInstallments;
    private BigDecimal totalPaidAmount;
    private BigDecimal totalPayableAmount;
    private BigDecimal outstandingAmount;
    private List<RepaymentScheduleItem> repaymentSchedule;
    private List<AdminPaymentEntryResponse> payments;
}
