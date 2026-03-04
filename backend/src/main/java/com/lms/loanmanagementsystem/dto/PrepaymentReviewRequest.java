package com.lms.loanmanagementsystem.dto;

import lombok.Data;

@Data
public class PrepaymentReviewRequest {
    private boolean approve;
    private String comment;
}
