package com.lms.loanmanagementsystem.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class AdminKycQueueResponse {

    private String userId;
    private String fullName;
    private String email;
    private String mobile;
    private String kycStatus;
    private String submittedAt;
}
