package com.lms.loanmanagementsystem.controller;

import com.lms.loanmanagementsystem.dto.AdminCustomerResponse;
import com.lms.loanmanagementsystem.dto.AdminKycQueueResponse;
import com.lms.loanmanagementsystem.dto.AdminKycResponse;
import com.lms.loanmanagementsystem.dto.KycReviewRequest;
import com.lms.loanmanagementsystem.service.AdminUserService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminUserControllerTest {

    @Mock
    private AdminUserService adminUserService;

    @InjectMocks
    private AdminUserController adminUserController;

    @Mock
    private Authentication authentication;

    @Test
    void shouldGetAllCustomers() {
        List<AdminCustomerResponse> customers =
                List.of(org.mockito.Mockito.mock(AdminCustomerResponse.class));
        when(adminUserService.getAllCustomers()).thenReturn(customers);

        List<AdminCustomerResponse> actual = adminUserController.getAllCustomers();

        assertSame(customers, actual);
        verify(adminUserService).getAllCustomers();
    }

    @Test
    void shouldGetPendingKycApplications() {
        List<AdminKycQueueResponse> pending =
                List.of(org.mockito.Mockito.mock(AdminKycQueueResponse.class));
        when(adminUserService.getPendingKycApplications()).thenReturn(pending);

        List<AdminKycQueueResponse> actual = adminUserController.getPendingKycApplications();

        assertSame(pending, actual);
        verify(adminUserService).getPendingKycApplications();
    }

    @Test
    void shouldGetUserKyc() {
        AdminKycResponse response = org.mockito.Mockito.mock(AdminKycResponse.class);
        when(adminUserService.getUserKycDetails("user-1")).thenReturn(response);

        AdminKycResponse actual = adminUserController.getUserKyc("user-1");

        assertSame(response, actual);
        verify(adminUserService).getUserKycDetails("user-1");
    }

    @Test
    void shouldReviewKyc() {
        KycReviewRequest request = new KycReviewRequest();
        when(authentication.getName()).thenReturn("admin-1");

        adminUserController.reviewKyc("user-1", request, authentication);

        verify(adminUserService).reviewKyc("user-1", "admin-1", request);
    }

    @Test
    void shouldResetAllCustomerWallets() {
        Map<String, Object> response = Map.of(
                "totalCustomers", 10,
                "updatedWallets", 3L
        );
        when(adminUserService.resetAllCustomerWalletBalances()).thenReturn(response);

        Map<String, Object> actual = adminUserController.resetAllCustomerWallets();

        assertEquals(response, actual);
        verify(adminUserService).resetAllCustomerWalletBalances();
    }
}
