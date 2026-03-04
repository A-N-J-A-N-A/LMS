package com.lms.loanmanagementsystem.controller;

import com.lms.loanmanagementsystem.dto.AdminCustomerResponse;
import com.lms.loanmanagementsystem.dto.AdminKycQueueResponse;
import com.lms.loanmanagementsystem.dto.AdminKycResponse;
import com.lms.loanmanagementsystem.dto.KycReviewRequest;
import com.lms.loanmanagementsystem.service.AdminUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/admin/users")
@RequiredArgsConstructor
@CrossOrigin
public class AdminUserController {

    private final AdminUserService adminUserService;

    @GetMapping("/customers")
    public List<AdminCustomerResponse> getAllCustomers() {
        return adminUserService.getAllCustomers();
    }

    @GetMapping("/kyc/pending")
    public List<AdminKycQueueResponse> getPendingKycApplications() {
        return adminUserService.getPendingKycApplications();
    }

    @GetMapping("/kyc/{userId}")
    public AdminKycResponse getUserKyc(@PathVariable String userId) {
        return adminUserService.getUserKycDetails(userId);
    }

    @PutMapping("/kyc-review/{userId}")
    public void reviewKyc(
            @PathVariable String userId,
            @RequestBody KycReviewRequest request,
            Authentication authentication
    ) {
        adminUserService.reviewKyc(userId, authentication.getName(), request);
    }

    @PostMapping("/wallets/reset")
    public Map<String, Object> resetAllCustomerWallets() {
        return adminUserService.resetAllCustomerWalletBalances();
    }
}
