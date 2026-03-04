package com.lms.loanmanagementsystem.service;

import com.lms.loanmanagementsystem.dto.LoanInfoResponse;
import com.lms.loanmanagementsystem.model.CommonKycRequirement;
import com.lms.loanmanagementsystem.model.LoanDescription;
import com.lms.loanmanagementsystem.model.LoanType;
import com.lms.loanmanagementsystem.repository.CommonKycRepository;
import com.lms.loanmanagementsystem.repository.LoanDescriptionRepository;
import com.lms.loanmanagementsystem.repository.LoanTypeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
@RequiredArgsConstructor
public class LoanInfoService {

    private final LoanDescriptionRepository loanDescriptionRepository;
    private final CommonKycRepository commonKycRepository;
    private final LoanTypeRepository loanTypeRepository;

    public LoanInfoResponse getLoanInfo(String loanTypeId) {

        LoanDescription loanDescription =
                loanDescriptionRepository.findByLoanTypeId(loanTypeId)
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        NOT_FOUND,
                                        "Loan details not found"
                                ));

        LoanType loanType =
                loanTypeRepository.findById(loanTypeId)
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        NOT_FOUND,
                                        "Loan type not found"
                                ));

        // copy min/max and tenure from loanType
        loanDescription.setMinAmount(loanType.getMinAmount().longValue());
        loanDescription.setMaxAmount(loanType.getMaxAmount().longValue());
        loanDescription.setMinTenure(loanType.getMinTenure());
        loanDescription.setMaxTenure(loanType.getMaxTenure());


        CommonKycRequirement commonKyc =
                commonKycRepository.findAll()
                        .stream()
                        .findFirst()
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        NOT_FOUND,
                                        "Common KYC not configured"
                                ));

        return new LoanInfoResponse(loanDescription, commonKyc);
    }
}
