package com.lms.loanmanagementsystem.dto;

import lombok.Data;

import java.time.LocalDate;

@Data
public class RegisterRequest {
    private String fullName;
    private String email;
    private String mobile;
    private String password;
}