package com.lms.loanmanagementsystem.controller;

import com.lms.loanmanagementsystem.dto.PaymentRequest;
import com.lms.loanmanagementsystem.dto.AdminProfitabilityResponse;
import com.lms.loanmanagementsystem.dto.PaymentSummaryResponse;
import com.lms.loanmanagementsystem.dto.StripeCheckoutFinalizeRequest;
import com.lms.loanmanagementsystem.dto.StripeCheckoutSessionRequest;
import com.lms.loanmanagementsystem.dto.StripeCheckoutSessionResponse;
import com.lms.loanmanagementsystem.dto.StripePaymentIntentRequest;
import com.lms.loanmanagementsystem.dto.StripePaymentIntentResponse;
import com.lms.loanmanagementsystem.model.Payment;
import com.lms.loanmanagementsystem.service.PaymentQueryService;
import com.lms.loanmanagementsystem.service.PaymentService;
import com.lms.loanmanagementsystem.service.PaymentSummaryService;
import com.lms.loanmanagementsystem.service.StripePaymentService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.security.core.Authentication;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PaymentControllerTest {

    @Mock
    private PaymentService paymentService;

    @Mock
    private PaymentQueryService paymentQueryService;

    @Mock
    private PaymentSummaryService paymentSummaryService;

    @Mock
    private StripePaymentService stripePaymentService;

    @InjectMocks
    private PaymentController paymentController;

    @Mock
    private Authentication authentication;

    @Test
    void shouldCreateStripePaymentIntent() {
        StripePaymentIntentRequest request = new StripePaymentIntentRequest();
        StripePaymentIntentResponse response = org.mockito.Mockito.mock(StripePaymentIntentResponse.class);
        when(authentication.getName()).thenReturn("user-1");
        when(stripePaymentService.createPaymentIntent(request, "user-1")).thenReturn(response);

        StripePaymentIntentResponse actual =
                paymentController.createStripePaymentIntent(request, authentication);

        assertSame(response, actual);
        verify(stripePaymentService).createPaymentIntent(request, "user-1");
    }

    @Test
    void shouldReturnStripePublishableKey() {
        when(stripePaymentService.getPublishableKey()).thenReturn("pk_test_key");

        String actual = paymentController.getStripePublishableKey();

        assertEquals("pk_test_key", actual);
        verify(stripePaymentService).getPublishableKey();
    }

    @Test
    void shouldCreateStripeCheckoutSession() {
        StripeCheckoutSessionRequest request = new StripeCheckoutSessionRequest();
        StripeCheckoutSessionResponse response = org.mockito.Mockito.mock(StripeCheckoutSessionResponse.class);
        when(authentication.getName()).thenReturn("user-1");
        when(stripePaymentService.createCheckoutSession(request, "user-1")).thenReturn(response);

        StripeCheckoutSessionResponse actual =
                paymentController.createStripeCheckoutSession(request, authentication);

        assertSame(response, actual);
        verify(stripePaymentService).createCheckoutSession(request, "user-1");
    }

    @Test
    void shouldFinalizeStripeCheckoutAndPayInstallment() {
        StripeCheckoutFinalizeRequest finalizeRequest = new StripeCheckoutFinalizeRequest();
        finalizeRequest.setSessionId("sess_123");
        PaymentRequest paymentRequest = new PaymentRequest();
        when(authentication.getName()).thenReturn("user-1");
        when(stripePaymentService.buildPaymentRequestFromCheckoutSession("sess_123", "user-1"))
                .thenReturn(paymentRequest);
        when(paymentService.payInstallment(paymentRequest, "user-1", "stripe-checkout-sess_123"))
                .thenReturn("ok");

        String actual = paymentController.finalizeStripeCheckout(finalizeRequest, authentication);

        assertEquals("ok", actual);
        verify(stripePaymentService).buildPaymentRequestFromCheckoutSession("sess_123", "user-1");
        verify(paymentService).payInstallment(paymentRequest, "user-1", "stripe-checkout-sess_123");
    }

    @Test
    void shouldMakeEmiPayment() {
        PaymentRequest request = new PaymentRequest();
        when(authentication.getName()).thenReturn("user-1");
        when(paymentService.payInstallment(request, "user-1", "idem-1")).thenReturn("paid");

        String actual = paymentController.makePayment(request, "idem-1", authentication);

        assertEquals("paid", actual);
        verify(paymentService).payInstallment(request, "user-1", "idem-1");
    }

    @Test
    void shouldPayApprovedPrepayment() {
        Map<String, BigDecimal> body = Map.of("amount", BigDecimal.valueOf(1250));
        when(authentication.getName()).thenReturn("user-1");
        when(paymentService.payApprovedPrepayment("pre-1", "user-1", BigDecimal.valueOf(1250), "idem-2"))
                .thenReturn("prepaid");

        String actual = paymentController.payPrepayment("pre-1", body, "idem-2", authentication);

        assertEquals("prepaid", actual);
        verify(paymentService).payApprovedPrepayment("pre-1", "user-1", BigDecimal.valueOf(1250), "idem-2");
    }

    @Test
    void shouldThrowWhenPrepaymentAmountMissing() {
        Map<String, BigDecimal> body = Map.of();
        when(authentication.getName()).thenReturn("user-1");

        assertThrows(IllegalArgumentException.class, () ->
                paymentController.payPrepayment("pre-1", body, "idem-2", authentication));
    }

    @Test
    void shouldListMyPayments() {
        Page<Payment> page = new PageImpl<>(List.of(org.mockito.Mockito.mock(Payment.class)));
        when(authentication.getName()).thenReturn("user-1");
        when(paymentQueryService.getMyPayments("user-1", "loan-1", "SUCCESS", 0, 20)).thenReturn(page);

        Page<Payment> actual = paymentController.listMyPayments(0, 20, "loan-1", "SUCCESS", authentication);

        assertSame(page, actual);
        verify(paymentQueryService).getMyPayments("user-1", "loan-1", "SUCCESS", 0, 20);
    }

    @Test
    void shouldListAllPaymentsForAdmin() {
        Page<Payment> page = new PageImpl<>(List.of(org.mockito.Mockito.mock(Payment.class)));
        when(paymentQueryService.getAllPaymentsForAdmin("loan-1", "user-1", "SUCCESS", 1, 10)).thenReturn(page);

        Page<Payment> actual = paymentController.listAllPaymentsForAdmin(1, 10, "loan-1", "user-1", "SUCCESS");

        assertSame(page, actual);
        verify(paymentQueryService).getAllPaymentsForAdmin("loan-1", "user-1", "SUCCESS", 1, 10);
    }

    @Test
    void shouldGetUserPaymentSummary() {
        PaymentSummaryResponse summary = org.mockito.Mockito.mock(PaymentSummaryResponse.class);
        when(authentication.getName()).thenReturn("user-1");
        when(paymentSummaryService.getUserSummary("loan-1", "user-1")).thenReturn(summary);

        PaymentSummaryResponse actual = paymentController.userSummary("loan-1", authentication);

        assertSame(summary, actual);
        verify(paymentSummaryService).getUserSummary("loan-1", "user-1");
    }

    @Test
    void shouldGetAdminPaymentSummary() {
        PaymentSummaryResponse summary = org.mockito.Mockito.mock(PaymentSummaryResponse.class);
        when(paymentSummaryService.getAdminSummary("loan-1")).thenReturn(summary);

        PaymentSummaryResponse actual = paymentController.adminSummary("loan-1");

        assertSame(summary, actual);
        verify(paymentSummaryService).getAdminSummary("loan-1");
    }

    @Test
    void shouldGetAdminProfitabilitySummary() {
        AdminProfitabilityResponse summary =
                new AdminProfitabilityResponse(BigDecimal.valueOf(1500), 3L);
        when(paymentSummaryService.getAdminProfitabilitySummary()).thenReturn(summary);

        AdminProfitabilityResponse actual = paymentController.adminProfitabilitySummary();

        assertSame(summary, actual);
        verify(paymentSummaryService).getAdminProfitabilitySummary();
    }
}
