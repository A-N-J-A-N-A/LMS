package com.lms.loanmanagementsystem.controller;

import com.lms.loanmanagementsystem.dto.AuthResponse;
import com.lms.loanmanagementsystem.dto.LoginRequest;
import com.lms.loanmanagementsystem.dto.RegisterRequest;
import com.lms.loanmanagementsystem.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
@CrossOrigin
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public void register(@RequestBody RegisterRequest request) {
        authService.register(request);
    }

//    @PostMapping("/login")
//    public AuthResponse login(@RequestBody LoginRequest request) {
//        String token = authService.loginUser(request);
//        return new AuthResponse(token);
//    }

    @PostMapping("/login/user")
    public AuthResponse userLogin(@RequestBody LoginRequest request) {
        String token = authService.loginUser(request);
        return new AuthResponse(token);
    }

    @PostMapping("/login/admin")
    public AuthResponse adminLogin(@RequestBody LoginRequest request) {
        String token = authService.loginAdmin(request);
        return new AuthResponse(token);
    }

}
