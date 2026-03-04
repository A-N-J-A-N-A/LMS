package com.lms.loanmanagementsystem.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class UpdateUserProfileRequest {
    private String fullName;
    private String mobile;
    private String profileImage;
    private String dateOfBirth;
    private String gender;
    private String maritalStatus;
    private String address;
    private String occupation;
    private String company;
    private BigDecimal monthlyIncome;
}
