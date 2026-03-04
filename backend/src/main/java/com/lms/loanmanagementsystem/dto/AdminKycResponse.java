package com.lms.loanmanagementsystem.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class AdminKycResponse {

    private String userId;
    private String fullName;
    private String email;
    private String mobile;

    private String panCard;
    private String aadhaarCard;

    private String fullNameAsPan;
    private LocalDate dateOfBirth;
    private String gender;
    private String maritalStatus;

    private String employmentType;
    private String salarySlip1;
    private String salarySlip2;
    private String salarySlip3;
    private String salarySlip4;
    private String salarySlip5;
    private String salarySlip6;
    private String bankStatement;

    private BigDecimal monthlyIncome;

    private String kycStatus;
    private String kycReviewComment;
    private String kycReviewedBy;
    private LocalDateTime kycReviewedAt;
}
