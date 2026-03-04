package com.lms.loanmanagementsystem.service;

import com.lms.loanmanagementsystem.dto.UserLoanApplicationResponse;
import com.lms.loanmanagementsystem.dto.KycStatusResponse;
import com.lms.loanmanagementsystem.dto.KycUpdateRequest;
import com.lms.loanmanagementsystem.dto.UpdateUserProfileRequest;
import com.lms.loanmanagementsystem.dto.UserProfileResponse;
import com.lms.loanmanagementsystem.model.KycStatus;
import com.lms.loanmanagementsystem.model.LoanApplication;
import com.lms.loanmanagementsystem.model.LoanStatus;
import com.lms.loanmanagementsystem.model.User;
import com.lms.loanmanagementsystem.repository.LoanApplicationRepository;
import com.lms.loanmanagementsystem.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.math.BigDecimal;
import java.util.List;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
@RequiredArgsConstructor
public class UserService {


    private final UserRepository userRepository;
    private final LoanApplicationRepository loanApplicationRepository;
    private final AppNotificationService appNotificationService;

//    private String mapStatus(LoanStatus status) {
//        return switch (status) {
//            case APPLIED -> "Application Submitted";
//            case APPROVED -> "Approved";
//            case REJECTED -> "Rejected";
//            case CLOSED -> "Closed";
//            default -> "Unknown Status";
//        };
//    }

    public UserProfileResponse getUserProfile(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return new UserProfileResponse(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getMobile(),
                user.getProfileImage(),
                user.getKycStatus(),
                user.getDateOfBirth(),
                user.getGender(),
                user.getMaritalStatus(),
                user.getAddress(),
                user.getOccupation(),
                user.getCompany(),
                user.getMonthlyIncome(),
                user.getWalletBalance() == null ? BigDecimal.ZERO : user.getWalletBalance(),
                user.getCreatedAt(),
                user.getLastLoginAt()
        );
    }

    public UserProfileResponse updateUserProfile(String userId, UpdateUserProfileRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "User not found"));

        if (request.getFullName() != null && !request.getFullName().trim().isEmpty()) {
            user.setFullName(request.getFullName().trim());
        }

        if (request.getMobile() != null && !request.getMobile().trim().isEmpty()) {
            user.setMobile(request.getMobile().trim());
        }

        if (request.getProfileImage() != null) {
            String image = request.getProfileImage().trim();
            user.setProfileImage(image.isEmpty() ? null : image);
        }

        if (request.getDateOfBirth() != null && !request.getDateOfBirth().trim().isEmpty()) {
            user.setDateOfBirth(LocalDate.parse(request.getDateOfBirth().trim()));
        }

        if (request.getGender() != null) {
            user.setGender(request.getGender().trim());
        }

        if (request.getMaritalStatus() != null) {
            user.setMaritalStatus(request.getMaritalStatus().trim());
        }

        if (request.getAddress() != null) {
            user.setAddress(request.getAddress().trim());
        }

        if (request.getOccupation() != null) {
            user.setOccupation(request.getOccupation().trim());
        }

        if (request.getCompany() != null) {
            user.setCompany(request.getCompany().trim());
        }

        if (request.getMonthlyIncome() != null) {
            user.setMonthlyIncome(request.getMonthlyIncome());
        }

        userRepository.save(user);
        return getUserProfile(userId);
    }

    public List<UserLoanApplicationResponse> getUserApplications(String userId) {

        List<LoanApplication> applications =
                loanApplicationRepository.findByUserId(userId);

        return applications.stream()
                .map(app -> new UserLoanApplicationResponse(
                        app.getId(),
                        app.getLoanTypeId(),
                        app.getAmount(),
                        app.getTenure(),
                        app.getStatus(),
                        app.getDisbursedAmount(),
                        app.getDisbursedAt(),
                        app.getCreatedAt(),
                        app.getReviewComment(),
                        app.getReviewedAt()
                ))
                .toList();
    }

    public List<LoanApplication> getUserLoans(String userId) {
        return loanApplicationRepository.findByUserId(userId);
    }

    // ========== KYC METHODS ==========

    public void updateKyc(String userId, KycUpdateRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "User not found"));

        // ========== VALIDATION ==========

        // Identity Proof
        if (request.getPanCard() == null || request.getPanCard().trim().isEmpty()) {
            throw new ResponseStatusException(BAD_REQUEST, "PAN Card is required");
        }

        // Address Proof
        if (request.getAadhaarCard() == null || request.getAadhaarCard().trim().isEmpty()) {
            throw new ResponseStatusException(BAD_REQUEST, "Aadhaar Card is required");
        }

        // Personal Details
        if (request.getFullNameAsPan() == null || request.getFullNameAsPan().trim().isEmpty()) {
            throw new ResponseStatusException(BAD_REQUEST, "Full name (as per PAN) is required");
        }

        if (request.getDateOfBirth() == null || request.getDateOfBirth().trim().isEmpty()) {
            throw new ResponseStatusException(BAD_REQUEST, "Date of birth is required");
        }

        if (request.getGender() == null || request.getGender().trim().isEmpty()) {
            throw new ResponseStatusException(BAD_REQUEST, "Gender is required");
        }

        if (request.getMaritalStatus() == null || request.getMaritalStatus().trim().isEmpty()) {
            throw new ResponseStatusException(BAD_REQUEST, "Marital status is required");
        }

        // Income & Employment Proof
        if (request.getEmploymentType() == null || request.getEmploymentType().trim().isEmpty()) {
            throw new ResponseStatusException(BAD_REQUEST, "Employment type is required");
        }

        if ("SALARIED".equalsIgnoreCase(request.getEmploymentType())) {
            if (request.getSalarySlips() == null || request.getSalarySlips().size() < 3) {
                throw new ResponseStatusException(BAD_REQUEST, "At least 3 salary slips are required for salaried employees");
            }
            if (request.getSalarySlips().size() > 6) {
                throw new ResponseStatusException(BAD_REQUEST, "Maximum 6 salary slips allowed");
            }
        } else if ("SELF_EMPLOYED".equalsIgnoreCase(request.getEmploymentType())) {
            if (request.getBankStatement() == null || request.getBankStatement().trim().isEmpty()) {
                throw new ResponseStatusException(BAD_REQUEST, "Bank statement is required for self-employed");
            }
        } else {
            throw new ResponseStatusException(BAD_REQUEST, "Invalid employment type");
        }

        // Credit Consent
        if (request.getCibilConsentGiven() == null || !request.getCibilConsentGiven()) {
            throw new ResponseStatusException(BAD_REQUEST, "CIBIL consent is required");
        }

       // UPDATE USER

        // Identity Proof
        user.setPanCard(request.getPanCard());

        // Address Proof
        user.setAadhaarCard(request.getAadhaarCard());

        // Personal Details
        user.setFullNameAsPan(request.getFullNameAsPan());
        user.setDateOfBirth(LocalDate.parse(request.getDateOfBirth()));
        user.setGender(request.getGender());
        user.setMaritalStatus(request.getMaritalStatus());
        user.setMobileVerified(true);
        user.setEmailVerified(true);

        // Income & Employment Proof
        user.setEmploymentType(request.getEmploymentType());

        if ("SALARIED".equalsIgnoreCase(request.getEmploymentType())) {

            // Clear bank statement
            user.setBankStatement(null);

            List<String> slips = request.getSalarySlips();

            user.setSalarySlip1(null);
            user.setSalarySlip2(null);
            user.setSalarySlip3(null);
            user.setSalarySlip4(null);
            user.setSalarySlip5(null);
            user.setSalarySlip6(null);

            if (slips.size() > 0) user.setSalarySlip1(slips.get(0));
            if (slips.size() > 1) user.setSalarySlip2(slips.get(1));
            if (slips.size() > 2) user.setSalarySlip3(slips.get(2));
            if (slips.size() > 3) user.setSalarySlip4(slips.get(3));
            if (slips.size() > 4) user.setSalarySlip5(slips.get(4));
            if (slips.size() > 5) user.setSalarySlip6(slips.get(5));

        } else if ("SELF_EMPLOYED".equalsIgnoreCase(request.getEmploymentType())) {

            // Clear all salary slips
            user.setSalarySlip1(null);
            user.setSalarySlip2(null);
            user.setSalarySlip3(null);
            user.setSalarySlip4(null);
            user.setSalarySlip5(null);
            user.setSalarySlip6(null);

            user.setBankStatement(request.getBankStatement());
        }

        // Credit Consent
        user.setCibilConsentGiven(request.getCibilConsentGiven());

        // Update KYC Status
        user.setKycStatus(KycStatus.SUBMITTED);

        userRepository.save(user);

        appNotificationService.notifyAdmins(
                "New KYC Submitted",
                "Customer " + user.getFullName() + " submitted KYC details for verification.",
                "KYC_SUBMITTED",
                user.getId()
        );
    }

    public KycStatusResponse getKycStatus(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "User not found"));

        KycStatus status = user.getKycStatus();

        return new KycStatusResponse(
                status,
                status == KycStatus.VERIFIED
        );
    }

}
