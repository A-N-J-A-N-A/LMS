package com.lms.loanmanagementsystem.dto;

import lombok.Data;
import java.util.List;

@Data
public class KycUpdateRequest {

    // Identity Proof
    private String panCard;

    // Address Proof
    private String aadhaarCard;

    // Personal Details
    private String fullNameAsPan;
    private String dateOfBirth;
    private String gender;
    private String maritalStatus;

    // Income & Employment Proof
    private String employmentType; // SALARIED / SELF_EMPLOYED
    private List<String> salarySlips; // For salaried (3-6 months)
    private String bankStatement; // For self-employed (6-12 months)

    // Credit Consent
    private Boolean cibilConsentGiven;
}