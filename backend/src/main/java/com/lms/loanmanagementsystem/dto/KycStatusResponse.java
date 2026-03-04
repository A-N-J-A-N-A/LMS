package com.lms.loanmanagementsystem.dto;
import com.lms.loanmanagementsystem.model.KycStatus;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class KycStatusResponse {
    private KycStatus kycStatus;
    private boolean kycCompleted;
}