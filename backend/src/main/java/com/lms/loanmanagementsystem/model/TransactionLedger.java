package com.lms.loanmanagementsystem.model;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Document(collection = "transaction_ledger")
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TransactionLedger {

    @Id
    private String id;

    private String loanId;

    private TransactionType transactionType;

    private BigDecimal amount;

    private LocalDateTime timestamp;

    private String remarks;

    // Added for EMI tracking
    private Integer installmentNo;

    // Calculations
    private BigDecimal principalComponent;
    private BigDecimal interestComponent;
    private BigDecimal penaltyComponent;

    // Trace to Payment receipt
    private String paymentId;
}
