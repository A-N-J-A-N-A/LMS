package com.lms.loanmanagementsystem.service;

import com.lms.loanmanagementsystem.dto.AdminCustomerResponse;
import com.lms.loanmanagementsystem.dto.AdminKycQueueResponse;
import com.lms.loanmanagementsystem.dto.AdminKycResponse;
import com.lms.loanmanagementsystem.dto.KycReviewRequest;
import com.lms.loanmanagementsystem.model.KycStatus;
import com.lms.loanmanagementsystem.model.User;
import com.lms.loanmanagementsystem.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AdminUserService {

    private final UserRepository userRepository;
    private final AppNotificationService appNotificationService;

    public void reviewKyc(String userId, String adminId, KycReviewRequest request) {

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "User not found"
                ));

        if (user.getKycStatus() != KycStatus.SUBMITTED) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "KYC not in SUBMITTED state"
            );
        }

        if (request.isApprove()) {
            user.setKycStatus(KycStatus.VERIFIED);
        } else {
            user.setKycStatus(KycStatus.REJECTED);
        }

        user.setKycReviewComment(request.getComment());
        user.setKycReviewedBy(adminId);
        user.setKycReviewedAt(LocalDateTime.now());

        userRepository.save(user);

        String statusLabel = request.isApprove() ? "approved" : "rejected";
        String comment = request.getComment() == null ? "" : request.getComment().trim();
        String commentSuffix = comment.isEmpty() ? "" : " Comment: " + comment;
        appNotificationService.notifyUser(
                user.getId(),
                "KYC Review Update",
                "Your KYC request has been " + statusLabel + " by admin." + commentSuffix,
                request.isApprove() ? "KYC_APPROVED" : "KYC_REJECTED",
                user.getId()
        );
    }

    public List<AdminKycQueueResponse> getPendingKycApplications() {
        return userRepository.findByRoleAndKycStatus("USER", KycStatus.SUBMITTED)
                .stream()
                .map(user -> new AdminKycQueueResponse(
                        user.getId(),
                        user.getFullName(),
                        user.getEmail(),
                        user.getMobile(),
                        user.getKycStatus() == null ? "UNKNOWN" : user.getKycStatus().name(),
                        user.getCreatedAt() == null ? null : user.getCreatedAt().toString()
                ))
                .toList();
    }

    public AdminKycResponse getUserKycDetails(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "User not found"
                ));

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
        response.setKycStatus(user.getKycStatus() == null ? "UNKNOWN" : user.getKycStatus().name());
        response.setKycReviewComment(user.getKycReviewComment());
        response.setKycReviewedBy(user.getKycReviewedBy());
        response.setKycReviewedAt(user.getKycReviewedAt());

        return response;
    }

    public List<AdminCustomerResponse> getAllCustomers() {
        List<User> customers = userRepository.findByRole("USER");

        return customers.stream()
                .map(user -> new AdminCustomerResponse(
                        user.getId(),
                        user.getFullName(),
                        user.getEmail(),
                        user.getMobile(),
                        user.getRole(),
                        user.getKycStatus() == null ? "UNKNOWN" : user.getKycStatus().name(),
                        user.getCreatedAt() == null ? null : user.getCreatedAt().toString()
                ))
                .toList();
    }

    public Map<String, Object> resetAllCustomerWalletBalances() {
        List<User> customers = userRepository.findByRole("USER");
        long updatedCount = 0;

        for (User customer : customers) {
            BigDecimal current = customer.getWalletBalance() == null
                    ? BigDecimal.ZERO
                    : customer.getWalletBalance();
            if (current.compareTo(BigDecimal.ZERO) == 0) {
                continue;
            }
            customer.setWalletBalance(BigDecimal.ZERO);
            userRepository.save(customer);
            updatedCount++;
        }

        return Map.of(
                "totalCustomers", customers.size(),
                "updatedWallets", updatedCount
        );
    }
}
