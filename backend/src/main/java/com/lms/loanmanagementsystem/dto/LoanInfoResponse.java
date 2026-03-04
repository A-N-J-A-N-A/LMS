package com.lms.loanmanagementsystem.dto;

import com.lms.loanmanagementsystem.model.CommonKycRequirement;
import com.lms.loanmanagementsystem.model.LoanDescription;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class LoanInfoResponse {

    private LoanDescription loanDetails;
    private CommonKycRequirement commonKyc;
}
