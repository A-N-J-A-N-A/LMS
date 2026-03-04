package com.lms.loanmanagementsystem.controller;

import com.lms.loanmanagementsystem.dto.AdminDashboardStatsResponse;
import com.lms.loanmanagementsystem.dto.AdminKycResponse;
import com.lms.loanmanagementsystem.dto.AdminLoanApplicationResponse;
import com.lms.loanmanagementsystem.dto.AdminLoanTrackerResponse;
import com.lms.loanmanagementsystem.dto.AdminReviewRequest;
import com.lms.loanmanagementsystem.dto.DisbursementRequest;
import com.lms.loanmanagementsystem.model.KycStatus;
import com.lms.loanmanagementsystem.model.LoanApplication;
import com.lms.loanmanagementsystem.model.LoanStatus;
import com.lms.loanmanagementsystem.model.User;
import com.lms.loanmanagementsystem.repository.UserRepository;
import com.lms.loanmanagementsystem.service.AdminLoanService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminLoanControllerTest {

    @Mock
    private AdminLoanService adminLoanService;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private AdminLoanController adminLoanController;

    @Mock
    private Authentication authentication;

    @Test
    void shouldGetDashboardStats() {
        AdminDashboardStatsResponse stats = org.mockito.Mockito.mock(AdminDashboardStatsResponse.class);
        when(adminLoanService.getDashboardStats()).thenReturn(stats);

        AdminDashboardStatsResponse actual = adminLoanController.getDashboardStats();

        assertSame(stats, actual);
        verify(adminLoanService).getDashboardStats();
    }

    @Test
    void shouldGetPendingApplications() {
        List<AdminLoanApplicationResponse> responses =
                List.of(org.mockito.Mockito.mock(AdminLoanApplicationResponse.class));
        when(adminLoanService.getPendingApplications()).thenReturn(responses);

        List<AdminLoanApplicationResponse> actual = adminLoanController.getPendingApplications();

        assertSame(responses, actual);
        verify(adminLoanService).getPendingApplications();
    }

    @Test
    void shouldGetRepaymentTracker() {
        AdminLoanTrackerResponse tracker = org.mockito.Mockito.mock(AdminLoanTrackerResponse.class);
        when(adminLoanService.getLoanRepaymentTracker("loan-1")).thenReturn(tracker);

        AdminLoanTrackerResponse actual = adminLoanController.getRepaymentTracker("loan-1");

        assertSame(tracker, actual);
        verify(adminLoanService).getLoanRepaymentTracker("loan-1");
    }

    @Test
    void shouldGetActiveLoans() {
        List<com.lms.loanmanagementsystem.dto.AdminActiveLoanResponse> activeLoans =
                List.of(org.mockito.Mockito.mock(com.lms.loanmanagementsystem.dto.AdminActiveLoanResponse.class));
        when(adminLoanService.getActiveLoans()).thenReturn(activeLoans);

        List<com.lms.loanmanagementsystem.dto.AdminActiveLoanResponse> actual =
                adminLoanController.getActiveLoans();

        assertSame(activeLoans, actual);
        verify(adminLoanService).getActiveLoans();
    }

    @Test
    void shouldGetAllApplicationsWithStatusFilter() {
        List<AdminLoanApplicationResponse> responses =
                List.of(org.mockito.Mockito.mock(AdminLoanApplicationResponse.class));
        when(adminLoanService.getAllApplications(LoanStatus.APPLIED)).thenReturn(responses);

        List<AdminLoanApplicationResponse> actual = adminLoanController.getAll(LoanStatus.APPLIED);

        assertSame(responses, actual);
        verify(adminLoanService).getAllApplications(LoanStatus.APPLIED);
    }

    @Test
    void shouldGetOneApplicationById() {
        AdminLoanApplicationResponse response = org.mockito.Mockito.mock(AdminLoanApplicationResponse.class);
        when(adminLoanService.getApplicationById("loan-1")).thenReturn(response);

        AdminLoanApplicationResponse actual = adminLoanController.getOne("loan-1");

        assertSame(response, actual);
        verify(adminLoanService).getApplicationById("loan-1");
    }

    @Test
    void shouldApproveApplication() {
        AdminReviewRequest request = new AdminReviewRequest();
        AdminLoanApplicationResponse response = org.mockito.Mockito.mock(AdminLoanApplicationResponse.class);
        when(authentication.getName()).thenReturn("admin-1");
        when(adminLoanService.approve("loan-1", "admin-1", request)).thenReturn(response);

        AdminLoanApplicationResponse actual = adminLoanController.approve("loan-1", request, authentication);

        assertSame(response, actual);
        verify(adminLoanService).approve("loan-1", "admin-1", request);
    }

    @Test
    void shouldRejectApplication() {
        AdminReviewRequest request = new AdminReviewRequest();
        AdminLoanApplicationResponse response = org.mockito.Mockito.mock(AdminLoanApplicationResponse.class);
        when(authentication.getName()).thenReturn("admin-1");
        when(adminLoanService.reject("loan-1", "admin-1", request)).thenReturn(response);

        AdminLoanApplicationResponse actual = adminLoanController.reject("loan-1", request, authentication);

        assertSame(response, actual);
        verify(adminLoanService).reject("loan-1", "admin-1", request);
    }

    @Test
    void shouldDisburseLoan() {
        DisbursementRequest request = new DisbursementRequest();
        request.setAmount(BigDecimal.valueOf(5000));
        LoanApplication disbursed = org.mockito.Mockito.mock(LoanApplication.class);
        when(authentication.getName()).thenReturn("admin-1");
        when(adminLoanService.disburseLoan("loan-1", "admin-1", BigDecimal.valueOf(5000))).thenReturn(disbursed);

        ResponseEntity<?> actual = adminLoanController.disburseLoan("loan-1", request, authentication);

        assertEquals(200, actual.getStatusCode().value());
        assertSame(disbursed, actual.getBody());
        verify(adminLoanService).disburseLoan("loan-1", "admin-1", BigDecimal.valueOf(5000));
    }

    @Test
    void shouldReturnApplicationDocumentInlineByDefault() {
        byte[] bytes = "abc".getBytes();
        AdminLoanService.DocumentPayload payload =
                new AdminLoanService.DocumentPayload(bytes, "application/pdf", "statement.pdf");
        when(adminLoanService.getApplicationDocument("loan-1", "salarySlip1")).thenReturn(payload);

        ResponseEntity<byte[]> actual =
                adminLoanController.getApplicationDocument("loan-1", "salarySlip1", false);

        assertEquals(200, actual.getStatusCode().value());
        assertArrayEquals(bytes, actual.getBody());
        assertEquals("application/pdf", actual.getHeaders().getContentType().toString());
        String disposition = actual.getHeaders().getFirst(HttpHeaders.CONTENT_DISPOSITION);
        assertEquals(true, disposition != null && disposition.contains("inline"));
        verify(adminLoanService).getApplicationDocument("loan-1", "salarySlip1");
    }

    @Test
    void shouldReturnApplicationDocumentAsAttachmentWhenRequested() {
        byte[] bytes = "abc".getBytes();
        AdminLoanService.DocumentPayload payload =
                new AdminLoanService.DocumentPayload(bytes, "application/pdf", "statement.pdf");
        when(adminLoanService.getApplicationDocument("loan-1", "salarySlip1")).thenReturn(payload);

        ResponseEntity<byte[]> actual =
                adminLoanController.getApplicationDocument("loan-1", "salarySlip1", true);

        String disposition = actual.getHeaders().getFirst(HttpHeaders.CONTENT_DISPOSITION);
        assertEquals(true, disposition != null && disposition.contains("attachment"));
    }

    @Test
    void shouldGetUserKycFromRepositoryUser() {
        User user = new User();
        user.setId("user-1");
        user.setFullName("User One");
        user.setEmail("user@example.com");
        user.setMobile("9999999999");
        user.setPanCard("PAN123");
        user.setAadhaarCard("AADHAAR123");
        user.setFullNameAsPan("User One");
        user.setDateOfBirth(LocalDate.of(1995, 1, 1));
        user.setKycStatus(KycStatus.VERIFIED);
        user.setMonthlyIncome(BigDecimal.valueOf(45000));
        when(userRepository.findById("user-1")).thenReturn(Optional.of(user));

        AdminKycResponse actual = adminLoanController.getUserKyc("user-1");

        assertEquals("user-1", actual.getUserId());
        assertEquals("User One", actual.getFullName());
        assertEquals("user@example.com", actual.getEmail());
        assertEquals("VERIFIED", actual.getKycStatus());
        verify(userRepository).findById("user-1");
    }

    @Test
    void shouldThrowWhenKycUserNotFound() {
        when(userRepository.findById("missing")).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> adminLoanController.getUserKyc("missing"));
    }
}
