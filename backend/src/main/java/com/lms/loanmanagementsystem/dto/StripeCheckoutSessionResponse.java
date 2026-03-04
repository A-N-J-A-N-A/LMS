package com.lms.loanmanagementsystem.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class StripeCheckoutSessionResponse {
    private String sessionId;
    private String checkoutUrl;
}
