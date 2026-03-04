package com.lms.loanmanagementsystem.controller;

import com.lms.loanmanagementsystem.model.AuditLog;
import com.lms.loanmanagementsystem.service.AuditLogService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.Collection;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuditLogControllerTest {

    @Mock
    private AuditLogService auditLogService;

    @InjectMocks
    private AuditLogController auditLogController;

    @Mock
    private Authentication authentication;

    @Test
    void shouldGetMyAuditLogs() {
        List<AuditLog> logs = List.of(new AuditLog());
        when(authentication.getName()).thenReturn("user-1");
        when(auditLogService.getLogsForUser("user-1")).thenReturn(logs);

        List<AuditLog> actual = auditLogController.getMyLogs(authentication);

        assertSame(logs, actual);
        verify(auditLogService).getLogsForUser("user-1");
    }

    @Test
    void shouldGetAllLogsForAdmin() {
        List<AuditLog> logs = List.of(new AuditLog());
        Collection<GrantedAuthority> authorities =
                List.of(new SimpleGrantedAuthority("ROLE_ADMIN"));
        doReturn(authorities).when(authentication).getAuthorities();
        when(auditLogService.getAllLogs()).thenReturn(logs);

        List<AuditLog> actual = auditLogController.getAllLogs(authentication);

        assertSame(logs, actual);
        verify(auditLogService).getAllLogs();
    }

    @Test
    void shouldThrowForNonAdminUserWhenGettingAllLogs() {
        Collection<GrantedAuthority> authorities =
                List.of(new SimpleGrantedAuthority("ROLE_USER"));
        doReturn(authorities).when(authentication).getAuthorities();

        assertThrows(RuntimeException.class, () -> auditLogController.getAllLogs(authentication));
        verify(auditLogService, never()).getAllLogs();
    }
}
