package com.lms.loanmanagementsystem.service;

import com.lms.loanmanagementsystem.config.JwtUtil;
import com.lms.loanmanagementsystem.dto.LoginRequest;
import com.lms.loanmanagementsystem.dto.RegisterRequest;
import com.lms.loanmanagementsystem.model.KycStatus;
import com.lms.loanmanagementsystem.model.User;
import com.lms.loanmanagementsystem.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    public void register(RegisterRequest request) {

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Email already registered"
            );
        }

        if (userRepository.existsByMobile(request.getMobile())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Mobile number already registered"
            );
        }

        User user = User.builder()
                .fullName(request.getFullName())
                .email(request.getEmail())
                .mobile(request.getMobile())
                .password(encoder.encode(request.getPassword()))
                .kycStatus(KycStatus.NOT_SUBMITTED)
                .role("USER")
                .walletBalance(BigDecimal.ZERO)
                .createdAt(LocalDateTime.now())
                .build();

        userRepository.save(user);
    }

    public String loginUser(LoginRequest request) {
        return loginByRole(request, "USER");
    }

    public String loginAdmin(LoginRequest request) {
        return loginByRole(request, "ADMIN");
    }

    public String login(LoginRequest request) {
        return loginUser(request);
    }

    private String loginByRole(LoginRequest request, String requiredRole) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.UNAUTHORIZED,
                                "Invalid credentials"
                        )
                );

        if (!encoder.matches(request.getPassword(), user.getPassword())) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Invalid credentials"
            );
        }

        String userRole = user.getRole() == null ? "" : user.getRole().toUpperCase(Locale.ROOT);
        if (!requiredRole.equals(userRole)) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Access denied for this login endpoint"
            );
        }

        user.setLastLoginAt(LocalDateTime.now());
        userRepository.save(user);

        return jwtUtil.generateToken(user.getId(), userRole);
    }
}
