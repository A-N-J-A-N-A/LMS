package com.lms.loanmanagementsystem.dto;

import com.lms.loanmanagementsystem.model.PrepaymentRequestStatus;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class PrepaymentRequestResponse {
    private String id;
    private String loanApplicationId;
    private String userId;
    private String customerName;
    private BigDecimal requestedAmount;
    private String reason;
    private PrepaymentRequestStatus status;
    private LocalDateTime requestedAt;
    private LocalDateTime reviewedAt;
    private String reviewedBy;
    private String reviewComment;
    private Boolean consumed;
    private LocalDateTime consumedAt;
}
