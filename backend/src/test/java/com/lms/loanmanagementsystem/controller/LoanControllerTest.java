package com.lms.loanmanagementsystem.controller;

import com.lms.loanmanagementsystem.dto.ApplyLoanRequest;
import com.lms.loanmanagementsystem.dto.ApplyLoanResponse;
import com.lms.loanmanagementsystem.dto.LoanApplicationDetailResponse;
import com.lms.loanmanagementsystem.model.LoanType;
import com.lms.loanmanagementsystem.service.LoanService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LoanControllerTest {

    @Mock
    private LoanService loanService;

    @InjectMocks
    private LoanController loanController;

    @Mock
    private Authentication authentication;

    @Test
    void shouldGetAllLoans() {
        List<LoanType> loans = List.of(org.mockito.Mockito.mock(LoanType.class));
        when(loanService.getActiveLoans()).thenReturn(loans);

        List<LoanType> actual = loanController.getAllLoans();

        assertSame(loans, actual);
        verify(loanService).getActiveLoans();
    }

    @Test
    void shouldGetLoanById() {
        LoanType loanType = org.mockito.Mockito.mock(LoanType.class);
        when(loanService.getLoanById("loan-type-1")).thenReturn(loanType);

        LoanType actual = loanController.getLoanById("loan-type-1");

        assertSame(loanType, actual);
        verify(loanService).getLoanById("loan-type-1");
    }

    @Test
    void shouldCallServiceWhenAuthenticated() {

        when(authentication.getName()).thenReturn("user1");

        ApplyLoanRequest request = new ApplyLoanRequest();
        request.setLoanTypeId("dummy");
        request.setAmount(BigDecimal.valueOf(100000));
        request.setTenure(24);

        String idempotencyKey = "test-key-123";
        ApplyLoanResponse response = org.mockito.Mockito.mock(ApplyLoanResponse.class);
        when(loanService.applyLoan(request, "user1", idempotencyKey)).thenReturn(response);

        ApplyLoanResponse actual = loanController.applyLoan(
                idempotencyKey,
                request,
                authentication
        );

        assertSame(response, actual);
        verify(loanService).applyLoan(
                request,
                "user1",
                idempotencyKey
        );
    }

    @Test
    void shouldGetLoanApplicationDetails() {
        LoanApplicationDetailResponse response = org.mockito.Mockito.mock(LoanApplicationDetailResponse.class);
        when(loanService.getLoanApplicationDetails("app-1", authentication)).thenReturn(response);

        LoanApplicationDetailResponse actual =
                loanController.getLoanApplicationDetails("app-1", authentication);

        assertSame(response, actual);
        verify(loanService).getLoanApplicationDetails("app-1", authentication);
    }
}
