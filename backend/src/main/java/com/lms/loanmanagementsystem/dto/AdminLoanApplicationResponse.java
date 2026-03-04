package com.lms.loanmanagementsystem.dto;

import com.lms.loanmanagementsystem.model.LoanStatus;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;

@Data
@AllArgsConstructor
public class AdminLoanApplicationResponse {

    private String applicationId;
    private String userId;
    private String customerName;
    private String kycStatus;
    private String loanTypeId;

    private BigDecimal amount;
    private Integer tenure;
    private LoanStatus status;

    private String reviewedBy;
    private String reviewComment;
    private LocalDateTime reviewedAt;

    private Map<String, Object> applicationData;
}
