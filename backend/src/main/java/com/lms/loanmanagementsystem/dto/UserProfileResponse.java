package com.lms.loanmanagementsystem.dto;
import com.lms.loanmanagementsystem.model.KycStatus;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class UserProfileResponse {

    private String id;
    private String fullName;
    private String email;
    private String mobile;
    private String profileImage;
    private KycStatus kycStatus;
    private LocalDate dateOfBirth;
    private String gender;
    private String maritalStatus;
    private String address;
    private String occupation;
    private String company;
    private BigDecimal monthlyIncome;
    private BigDecimal walletBalance;
    private LocalDateTime createdAt;
    private LocalDateTime lastLoginAt;
}
