package com.lms.loanmanagementsystem.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class StripePaymentIntentResponse {
    private String clientSecret;
    private String paymentIntentId;
}
