package com.lms.loanmanagementsystem.model;
import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Document(collection = "loan_types")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoanType {

    @Id
    private String id;

    private String code;          // PERSONAL, HOME, EDU
    private String name;          // Personal Loan
    private String category;      // SECURED / UNSECURED

    private BigDecimal minAmount;
    private BigDecimal maxAmount;

    private Integer minTenure;    // months
    private Integer maxTenure;

    private Double interestRate;

    private String status;        // ACTIVE / INACTIVE
    private LocalDateTime createdAt;
}
