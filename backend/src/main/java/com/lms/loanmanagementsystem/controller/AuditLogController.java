package com.lms.loanmanagementsystem.controller;

import com.lms.loanmanagementsystem.model.AuditLog;
import com.lms.loanmanagementsystem.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/audit")
@RequiredArgsConstructor
@CrossOrigin
public class AuditLogController {

    private final AuditLogService auditLogService;

    // USER → only own logs
    @GetMapping("/me")
    public List<AuditLog> getMyLogs(Authentication authentication) {
        String userId = authentication.getName();
        return auditLogService.getLogsForUser(userId);
    }

    // ADMIN → all logs
    @GetMapping("/all")
    public List<AuditLog> getAllLogs(Authentication authentication) {
        boolean isAdmin =
                authentication.getAuthorities()
                        .stream()
                        .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));

        if (!isAdmin) {
            throw new RuntimeException("Access denied");
        }

        return auditLogService.getAllLogs();
    }
}
