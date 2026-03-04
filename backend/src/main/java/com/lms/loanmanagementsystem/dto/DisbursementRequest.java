package com.lms.loanmanagementsystem.dto;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class DisbursementRequest {
    private BigDecimal amount;
}

