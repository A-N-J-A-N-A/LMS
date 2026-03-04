package com.lms.loanmanagementsystem.dto;

import lombok.Data;

@Data
public class KycReviewRequest {

    private boolean approve;   // true = verify, false = reject
    private String comment;    // optional admin remark
}
