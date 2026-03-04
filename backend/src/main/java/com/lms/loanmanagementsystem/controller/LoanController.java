package com.lms.loanmanagementsystem.controller;

import com.lms.loanmanagementsystem.dto.ApplyLoanRequest;
import com.lms.loanmanagementsystem.dto.ApplyLoanResponse;
import com.lms.loanmanagementsystem.dto.LoanApplicationDetailResponse;
import com.lms.loanmanagementsystem.model.LoanType;
import com.lms.loanmanagementsystem.service.LoanService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/loans")
@RequiredArgsConstructor
@CrossOrigin
public class LoanController {

    private final LoanService loanService;

    @GetMapping
    public List<LoanType> getAllLoans() {
        return loanService.getActiveLoans();
    }

    @GetMapping("/{loanId}")
    public LoanType getLoanById(@PathVariable String loanId) {
        return loanService.getLoanById(loanId);
    }

    @PostMapping("/apply")
    public ApplyLoanResponse applyLoan(
            @RequestHeader("Idempotency-Key") String idempotencyKey,
            @RequestBody ApplyLoanRequest request,
            Authentication authentication
    ) {
        String userId = authentication.getName();
        return loanService.applyLoan(request, userId, idempotencyKey);
    }


    @GetMapping("/application/{id}")
    public LoanApplicationDetailResponse getLoanApplicationDetails(
            @PathVariable String id,
            Authentication authentication
    ) {
        return loanService.getLoanApplicationDetails(id, authentication);
    }



}
