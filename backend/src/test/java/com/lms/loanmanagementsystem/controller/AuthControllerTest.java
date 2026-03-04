package com.lms.loanmanagementsystem.controller;

import com.lms.loanmanagementsystem.dto.RegisterRequest;
import com.lms.loanmanagementsystem.dto.AuthResponse;
import com.lms.loanmanagementsystem.dto.LoginRequest;
import com.lms.loanmanagementsystem.service.AuthService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    @Mock
    private AuthService authService;

    @InjectMocks
    private AuthController authController;

    @Test
    void shouldRegisterUserSuccessfully() {
        RegisterRequest request = new RegisterRequest();
        request.setFullName("Test User");
        request.setEmail("test@example.com");
        request.setMobile("9876543210");
        request.setPassword("password");

        authController.register(request);

        verify(authService).register(request);
    }

    @Test
    void shouldLoginUserViaUserEndpoint() {
        LoginRequest request = new LoginRequest();
        when(authService.loginUser(request)).thenReturn("token-user");

        AuthResponse response = authController.userLogin(request);

        assertEquals("token-user", response.getToken());
        verify(authService).loginUser(request);
    }

    @Test
    void shouldLoginAdminViaAdminEndpoint() {
        LoginRequest request = new LoginRequest();
        when(authService.loginAdmin(request)).thenReturn("token-admin");

        AuthResponse response = authController.adminLogin(request);

        assertEquals("token-admin", response.getToken());
        verify(authService).loginAdmin(request);
    }
}
