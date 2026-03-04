package com.lms.loanmanagementsystem.dto;

import lombok.Data;

@Data
public class StripeCheckoutFinalizeRequest {
    private String sessionId;
    private String reason;
}
