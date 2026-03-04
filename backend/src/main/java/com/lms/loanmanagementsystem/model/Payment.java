package com.lms.loanmanagementsystem.model;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Document(collection = "payments")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Payment {

    @Id
    private String id;

    private String applicationId;
    private String userId;

    private Integer installmentNo;

    private BigDecimal amount;

    private LocalDateTime paymentDate;

    private String status; // SUCCESS / FAILED

    private String idempotencyKey; // to prevent duplicate payment requests
    private String remarks;
}
