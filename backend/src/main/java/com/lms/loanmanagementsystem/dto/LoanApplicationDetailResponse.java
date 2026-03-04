package com.lms.loanmanagementsystem.dto;

import com.lms.loanmanagementsystem.model.LoanStatus;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@AllArgsConstructor
public class LoanApplicationDetailResponse {

    private String applicationId;
    private String loanTypeId;
    private String loanName;
    private BigDecimal sanctionedAmount;
    private BigDecimal loanAmount;
    private BigDecimal disbursedAmount;
    private LocalDateTime disbursedAt;
    private String disbursedBy;
    private Integer tenure;
    private Double interestRate;
    private LoanStatus status;

    private List<RepaymentScheduleItem> repaymentSchedule;
}
