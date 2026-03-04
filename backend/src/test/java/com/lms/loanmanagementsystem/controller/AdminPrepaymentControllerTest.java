package com.lms.loanmanagementsystem.controller;

import com.lms.loanmanagementsystem.dto.PrepaymentRequestResponse;
import com.lms.loanmanagementsystem.dto.PrepaymentReviewRequest;
import com.lms.loanmanagementsystem.model.PrepaymentRequestStatus;
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
class AdminPrepaymentControllerTest {

    @Mock
    private PrepaymentRequestService prepaymentRequestService;

    @InjectMocks
    private AdminPrepaymentController adminPrepaymentController;

    @Mock
    private Authentication authentication;

    @Test
    void shouldGetPrepaymentRequestsByStatus() {
        List<PrepaymentRequestResponse> responses =
                List.of(org.mockito.Mockito.mock(PrepaymentRequestResponse.class));
        when(prepaymentRequestService.getAllRequests(PrepaymentRequestStatus.APPROVED)).thenReturn(responses);

        List<PrepaymentRequestResponse> actual =
                adminPrepaymentController.getRequests(PrepaymentRequestStatus.APPROVED);

        assertSame(responses, actual);
        verify(prepaymentRequestService).getAllRequests(PrepaymentRequestStatus.APPROVED);
    }

    @Test
    void shouldReviewPrepaymentRequest() {
        PrepaymentReviewRequest request = new PrepaymentReviewRequest();
        PrepaymentRequestResponse response = org.mockito.Mockito.mock(PrepaymentRequestResponse.class);
        when(authentication.getName()).thenReturn("admin-1");
        when(prepaymentRequestService.reviewRequest("prepay-1", "admin-1", request)).thenReturn(response);

        PrepaymentRequestResponse actual =
                adminPrepaymentController.reviewRequest("prepay-1", request, authentication);

        assertSame(response, actual);
        verify(prepaymentRequestService).reviewRequest("prepay-1", "admin-1", request);
    }
}
