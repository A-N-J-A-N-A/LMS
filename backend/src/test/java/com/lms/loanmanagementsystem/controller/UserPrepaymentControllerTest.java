package com.lms.loanmanagementsystem.controller;

import com.lms.loanmanagementsystem.dto.PrepaymentRequestCreateRequest;
import com.lms.loanmanagementsystem.dto.PrepaymentRequestResponse;
import com.lms.loanmanagementsystem.service.PrepaymentRequestService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserPrepaymentControllerTest {

    @Mock
    private PrepaymentRequestService prepaymentRequestService;

    @InjectMocks
    private UserPrepaymentController userPrepaymentController;

    @Mock
    private Authentication authentication;

    @Test
    void shouldCreatePrepaymentRequest() {
        PrepaymentRequestCreateRequest request = new PrepaymentRequestCreateRequest();
        PrepaymentRequestResponse response = org.mockito.Mockito.mock(PrepaymentRequestResponse.class);
        when(authentication.getName()).thenReturn("user-1");
        when(prepaymentRequestService.createRequest("user-1", request)).thenReturn(response);

        PrepaymentRequestResponse actual = userPrepaymentController.create(request, authentication);

        assertSame(response, actual);
        verify(prepaymentRequestService).createRequest("user-1", request);
    }

    @Test
    void shouldGetUserPrepaymentRequestsWithOptionalLoanId() {
        List<PrepaymentRequestResponse> responses =
                List.of(org.mockito.Mockito.mock(PrepaymentRequestResponse.class));
        when(authentication.getName()).thenReturn("user-1");
        when(prepaymentRequestService.getUserRequests("user-1", "loan-1")).thenReturn(responses);

        List<PrepaymentRequestResponse> actual =
                userPrepaymentController.getMyRequests("loan-1", authentication);

        assertSame(responses, actual);
        verify(prepaymentRequestService).getUserRequests("user-1", "loan-1");
    }
}
