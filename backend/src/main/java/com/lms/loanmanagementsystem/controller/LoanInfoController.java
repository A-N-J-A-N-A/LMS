package com.lms.loanmanagementsystem.controller;

import com.lms.loanmanagementsystem.dto.LoanInfoResponse;
import com.lms.loanmanagementsystem.service.LoanInfoService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/loans/info")
@RequiredArgsConstructor
@CrossOrigin
public class LoanInfoController {

    private final LoanInfoService loanInfoService;

    @GetMapping("/{loanTypeId}")
    public LoanInfoResponse getLoanInfo(
            @PathVariable String loanTypeId
    ) {
        return loanInfoService.getLoanInfo(loanTypeId);
    }
}
