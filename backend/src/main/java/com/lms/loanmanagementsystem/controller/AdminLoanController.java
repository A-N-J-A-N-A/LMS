package com.lms.loanmanagementsystem.controller;

import com.lms.loanmanagementsystem.dto.*;
import com.lms.loanmanagementsystem.model.LoanStatus;
import com.lms.loanmanagementsystem.dto.DisbursementRequest;
import com.lms.loanmanagementsystem.model.User;
import com.lms.loanmanagementsystem.repository.UserRepository;
import com.lms.loanmanagementsystem.service.AdminLoanService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.util.List;

@RestController
@RequestMapping("/admin/loan-applications")
@RequiredArgsConstructor
@CrossOrigin
public class AdminLoanController {

    private final AdminLoanService adminLoanService;
    private final UserRepository userRepository;
    // Dashboard Stats
    @GetMapping("/dashboard-stats")
    public AdminDashboardStatsResponse getDashboardStats() {
        return adminLoanService.getDashboardStats();
    }

    // Get Pending
    @GetMapping("/pending")
    public List<AdminLoanApplicationResponse> getPendingApplications() {
        return adminLoanService.getPendingApplications();
    }

    @GetMapping("/active-loans")
    public List<AdminActiveLoanResponse> getActiveLoans() {
        return adminLoanService.getActiveLoans();
    }

    @GetMapping("/{id}/repayment-tracker")
    public AdminLoanTrackerResponse getRepaymentTracker(@PathVariable String id) {
        return adminLoanService.getLoanRepaymentTracker(id);
    }

    // Get All (Optional Filter)
    @GetMapping
    public List<AdminLoanApplicationResponse> getAll(
            @RequestParam(name = "status", required = false) LoanStatus status
    ) {
        return adminLoanService.getAllApplications(status);
    }

    @GetMapping("/{id}")
    public AdminLoanApplicationResponse getOne(@PathVariable String id) {
        return adminLoanService.getApplicationById(id);
    }

    // Approve
    @PutMapping("/approve/{id}")
    public AdminLoanApplicationResponse approve(
            @PathVariable String id,
            @RequestBody AdminReviewRequest request,
            Authentication authentication
    ) {
        return adminLoanService.approve(
                id,
                authentication.getName(),
                request
        );
    }

    // Reject
    @PutMapping("/reject/{id}")
    public AdminLoanApplicationResponse reject(
            @PathVariable String id,
            @RequestBody AdminReviewRequest request,
            Authentication authentication
    ) {
        return adminLoanService.reject(
                id,
                authentication.getName(),
                request
        );
    }

    @PostMapping("/disburse/{loanId}")
    public ResponseEntity<?> disburseLoan(
            @PathVariable String loanId,
            @RequestBody DisbursementRequest request,
            Authentication authentication
    ) {
        return ResponseEntity.ok(
                adminLoanService.disburseLoan(
                        loanId,
                        authentication.getName(),
                        request.getAmount()
                )
        );
    }

    @GetMapping("/{id}/documents/{fieldName}")
    public ResponseEntity<byte[]> getApplicationDocument(
            @PathVariable String id,
            @PathVariable String fieldName,
            @RequestParam(defaultValue = "false") boolean download
    ) {
        AdminLoanService.DocumentPayload payload =
                adminLoanService.getApplicationDocument(id, fieldName);

        ContentDisposition disposition = (download
                ? ContentDisposition.attachment()
                : ContentDisposition.inline())
                .filename(payload.filename(), StandardCharsets.UTF_8)
                .build();

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(payload.mimeType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .body(payload.bytes());
    }

    @GetMapping("/kyc/{userId}")
    public AdminKycResponse getUserKyc(@PathVariable String userId) {

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        AdminKycResponse response = new AdminKycResponse();

        response.setUserId(user.getId());
        response.setFullName(user.getFullName());
        response.setEmail(user.getEmail());
        response.setMobile(user.getMobile());

        response.setPanCard(user.getPanCard());
        response.setAadhaarCard(user.getAadhaarCard());

        response.setFullNameAsPan(user.getFullNameAsPan());
        response.setDateOfBirth(user.getDateOfBirth());
        response.setGender(user.getGender());
        response.setMaritalStatus(user.getMaritalStatus());

        response.setEmploymentType(user.getEmploymentType());
        response.setSalarySlip1(user.getSalarySlip1());
        response.setSalarySlip2(user.getSalarySlip2());
        response.setSalarySlip3(user.getSalarySlip3());
        response.setSalarySlip4(user.getSalarySlip4());
        response.setSalarySlip5(user.getSalarySlip5());
        response.setSalarySlip6(user.getSalarySlip6());
        response.setBankStatement(user.getBankStatement());

        response.setMonthlyIncome(user.getMonthlyIncome());

        response.setKycStatus(user.getKycStatus().name());
        response.setKycReviewComment(user.getKycReviewComment());
        response.setKycReviewedBy(user.getKycReviewedBy());
        response.setKycReviewedAt(user.getKycReviewedAt());

        return response;
    }

}
