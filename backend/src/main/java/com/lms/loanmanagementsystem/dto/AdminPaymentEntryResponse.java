package com.lms.loanmanagementsystem.dto;

import com.lms.loanmanagementsystem.model.TransactionType;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class AdminPaymentEntryResponse {
    private String id;
    private TransactionType transactionType;
    private BigDecimal amount;
    private LocalDateTime timestamp;
    private String remarks;
}
