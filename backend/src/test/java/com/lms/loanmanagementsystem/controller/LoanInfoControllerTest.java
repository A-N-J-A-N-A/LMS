package com.lms.loanmanagementsystem.controller;

import com.lms.loanmanagementsystem.dto.LoanInfoResponse;
import com.lms.loanmanagementsystem.service.LoanInfoService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LoanInfoControllerTest {

    @Mock
    private LoanInfoService loanInfoService;

    @InjectMocks
    private LoanInfoController loanInfoController;

    @Test
    void shouldReturnLoanInfoFromService() {
        LoanInfoResponse response = org.mockito.Mockito.mock(LoanInfoResponse.class);
        when(loanInfoService.getLoanInfo("home-loan")).thenReturn(response);

        LoanInfoResponse actual = loanInfoController.getLoanInfo("home-loan");

        assertSame(response, actual);
        verify(loanInfoService).getLoanInfo("home-loan");
    }
}
