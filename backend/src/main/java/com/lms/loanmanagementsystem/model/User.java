package com.lms.loanmanagementsystem.model;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Document(collection = "users")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    private String id;

    private String fullName;
    @Indexed(unique = true)
    private String email;
    @Indexed(unique = true)
    private String mobile;

    private String password;

    private KycStatus kycStatus;
    private String role;

    // COMMON KYC FIELDS

    // Identity Proof
    private String panCard; // Base64 or URL

    // Address Proof
    private String aadhaarCard; // Base64 or URL

    // Personal Details
    private String fullNameAsPan;
    private LocalDate dateOfBirth;
    private String gender;
    private Boolean mobileVerified;
    private Boolean emailVerified;
    private String maritalStatus;

    // Income & Employment Proof
    private String employmentType; // SALARIED / SELF_EMPLOYED
    private String salarySlip1; // Base64 or URL
    private String salarySlip2;
    private String salarySlip3;
    private String salarySlip4;
    private String salarySlip5;
    private String salarySlip6;
    private String bankStatement; // Base64 or URL (for self-employed)

    // Credit Consent
    private Boolean cibilConsentGiven;

    // KYC verification
    private String kycReviewComment;
    private String kycReviewedBy;
    private LocalDateTime kycReviewedAt;

    // Profile fields
    private String profileImage;
    private String address;
    private String occupation;
    private String company;
    private BigDecimal monthlyIncome;
    private BigDecimal walletBalance;

    // Activity fields
    private LocalDateTime createdAt;
    private LocalDateTime lastLoginAt;

}
