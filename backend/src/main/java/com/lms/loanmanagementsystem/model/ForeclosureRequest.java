package com.lms.loanmanagementsystem.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Document(collection = "foreclosure_requests")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ForeclosureRequest {
    @Id
    private String id;
    private String loanApplicationId;
    private String userId;
    private BigDecimal requestedAmount;
    private String reason;
    private ForeclosureRequestStatus status;
    private LocalDateTime requestedAt;
    private LocalDateTime reviewedAt;
    private String reviewedBy;
    private String reviewComment;
    private Boolean consumed;
    private LocalDateTime consumedAt;
    private String consumedByPaymentId;
}
