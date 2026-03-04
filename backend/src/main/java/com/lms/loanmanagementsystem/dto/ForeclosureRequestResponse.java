package com.lms.loanmanagementsystem.dto;

import com.lms.loanmanagementsystem.model.ForeclosureRequestStatus;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class ForeclosureRequestResponse {
    private String id;
    private String loanApplicationId;
    private String userId;
    private String customerName;
    private BigDecimal requestedAmount;
    private String reason;
    private ForeclosureRequestStatus status;
    private LocalDateTime requestedAt;
    private LocalDateTime reviewedAt;
    private String reviewedBy;
    private String reviewComment;
    private Boolean consumed;
    private LocalDateTime consumedAt;
}
