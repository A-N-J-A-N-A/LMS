package com.lms.loanmanagementsystem.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class AdminCustomerResponse {

    private String userId;
    private String name;
    private String email;
    private String mobile;
    private String role;
    private String status;
    private String createdAt;
}
