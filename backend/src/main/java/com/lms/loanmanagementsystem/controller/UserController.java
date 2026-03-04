package com.lms.loanmanagementsystem.controller;

import com.lms.loanmanagementsystem.dto.UserLoanApplicationResponse;
import com.lms.loanmanagementsystem.dto.KycStatusResponse;
import com.lms.loanmanagementsystem.dto.KycUpdateRequest;
import com.lms.loanmanagementsystem.dto.UpdateUserProfileRequest;
import com.lms.loanmanagementsystem.dto.UserProfileResponse;
import com.lms.loanmanagementsystem.model.LoanApplication;
import com.lms.loanmanagementsystem.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/user")
@RequiredArgsConstructor
@CrossOrigin
public class UserController {

    private final UserService userService;

    @GetMapping("/profile")
    public UserProfileResponse getProfile(Authentication authentication) {
        String userId = authentication.getName();
        return userService.getUserProfile(userId);
    }

    @PutMapping("/profile")
    public UserProfileResponse updateProfile(
            @RequestBody UpdateUserProfileRequest request,
            Authentication authentication
    ) {
        String userId = authentication.getName();
        return userService.updateUserProfile(userId, request);
    }

    @GetMapping("/loans")
    public List<LoanApplication> getUserLoans(Authentication authentication) {
        String userId = authentication.getName();
        return userService.getUserLoans(userId);
    }

    @GetMapping("/applications")
    public List<UserLoanApplicationResponse> getUserApplications(Authentication authentication) {
        String userId = authentication.getName();
        return userService.getUserApplications(userId);
    }

    @PostMapping("/kyc/update")
    public void updateKyc(
            @RequestBody KycUpdateRequest request,
            Authentication authentication
    ) {
        String userId = authentication.getName();
        userService.updateKyc(userId, request);
    }

    @GetMapping("/kyc/status")
    public KycStatusResponse getKycStatus(Authentication authentication) {
        String userId = authentication.getName();
        return userService.getKycStatus(userId);
    }

}
