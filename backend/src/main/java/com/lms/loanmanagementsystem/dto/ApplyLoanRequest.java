package com.lms.loanmanagementsystem.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.util.Map;

@Data
public class ApplyLoanRequest {

    private String loanTypeId;
    private BigDecimal amount;
    private Integer tenure;

    // Common fields
    private Map<String, Object> applicationData;

    // Personal Loan
    private String loanPurpose;

    // Home Loan
    private String propertyAddress;
    private String propertyType;

    // Business Loan
    private String businessName;
    private String businessType;
    private String gstRegistration;
    private String businessPan;

    // Education Loan
    private String studentName;
    private String studentDob;
    private String courseName;
    private String universityDetails;
    private String admissionLetter;
    private String feeStructure;
    private String courseDuration;

    // Education Loan - Co-Applicant
    private String coApplicantName;
    private String coApplicantIdProof;
    private String coApplicantAddressProof;
    private String coApplicantIncomeProof;
}