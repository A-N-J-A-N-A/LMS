package com.lms.loanmanagementsystem.controller;

import com.lms.loanmanagementsystem.dto.PaymentRequest;
import com.lms.loanmanagementsystem.dto.AdminProfitabilityResponse;
import com.lms.loanmanagementsystem.dto.PaymentSummaryResponse;
import com.lms.loanmanagementsystem.dto.ForeclosureQuoteResponse;
import com.lms.loanmanagementsystem.dto.ForeclosurePaymentRequest;
import com.lms.loanmanagementsystem.dto.ForeclosurePaymentResponse;
import com.lms.loanmanagementsystem.dto.StripeCheckoutFinalizeRequest;
import com.lms.loanmanagementsystem.dto.StripeCheckoutSessionRequest;
import com.lms.loanmanagementsystem.dto.StripeCheckoutSessionResponse;
import com.lms.loanmanagementsystem.dto.StripeForeclosureCheckoutSessionRequest;
import com.lms.loanmanagementsystem.dto.StripePaymentIntentRequest;
import com.lms.loanmanagementsystem.dto.StripePaymentIntentResponse;
import com.lms.loanmanagementsystem.model.Payment;
import com.lms.loanmanagementsystem.service.PaymentQueryService;
import com.lms.loanmanagementsystem.service.PaymentService;
import com.lms.loanmanagementsystem.service.PaymentSummaryService;
import com.lms.loanmanagementsystem.service.StripePaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;
    private final PaymentQueryService paymentQueryService;
    private final PaymentSummaryService paymentSummaryService;
    private final StripePaymentService stripePaymentService;

    @PostMapping("/payments/stripe/create-intent")
    public StripePaymentIntentResponse createStripePaymentIntent(
            @RequestBody StripePaymentIntentRequest request,
            Authentication authentication
    ) {
        paymentService.getEmiEligibility(request.getApplicationId(), authentication.getName());
        return stripePaymentService.createPaymentIntent(request, authentication.getName());
    }

    @GetMapping("/payments/stripe/publishable-key")
    public String getStripePublishableKey() {
        return stripePaymentService.getPublishableKey();
    }

    @PostMapping("/payments/stripe/create-checkout-session")
    public StripeCheckoutSessionResponse createStripeCheckoutSession(
            @RequestBody StripeCheckoutSessionRequest request,
            Authentication authentication
    ) {
        paymentService.getEmiEligibility(request.getApplicationId(), authentication.getName());
        String userId = authentication.getName();
        StripeCheckoutSessionResponse response = stripePaymentService.createCheckoutSession(request, userId);
        paymentService.createPendingEmiCheckoutPayment(
                request.getApplicationId(),
                request.getInstallmentNo(),
                request.getAmount(),
                userId,
                response.getSessionId()
        );
        return response;
    }

    @PostMapping("/payments/stripe/create-foreclosure-checkout-session")
    public StripeCheckoutSessionResponse createStripeForeclosureCheckoutSession(
            @RequestBody StripeForeclosureCheckoutSessionRequest request,
            Authentication authentication
    ) {
        String userId = authentication.getName();
        return stripePaymentService.createForeclosureCheckoutSession(request, userId);
    }

    @GetMapping("/payments/emi-eligibility")
    public Map<String, Object> getEmiEligibility(
            @RequestParam("applicationId") String applicationId,
            Authentication authentication
    ) {
        PaymentService.EmiEligibility eligibility = paymentService.getEmiEligibility(
                applicationId,
                authentication.getName()
        );
        return Map.of(
                "eligible", eligibility.eligible(),
                "message", eligibility.message()
        );
    }

    @GetMapping("/payments/foreclosure/quote")
    public ForeclosureQuoteResponse getForeclosureQuote(
            @RequestParam("applicationId") String applicationId,
            Authentication authentication
    ) {
        return paymentService.getForeclosureQuote(applicationId, authentication.getName());
    }

    @PostMapping("/payments/foreclosure/pay")
    public ForeclosurePaymentResponse payForeclosure(
            @RequestBody ForeclosurePaymentRequest request,
            @RequestHeader("Idempotency-Key") String idempotencyKey,
            Authentication authentication
    ) {
        return paymentService.payForeclosure(request, authentication.getName(), idempotencyKey);
    }

    @PostMapping("/payments/stripe/finalize-checkout")
    public String finalizeStripeCheckout(
            @RequestBody StripeCheckoutFinalizeRequest request,
            Authentication authentication
    ) {
        String userId = authentication.getName();
        try {
            PaymentRequest paymentRequest = stripePaymentService
                    .buildPaymentRequestFromCheckoutSession(request.getSessionId(), userId);
            String idempotencyKey = "stripe-checkout-" + request.getSessionId();
            return paymentService.payInstallment(paymentRequest, userId, idempotencyKey);
        } catch (RuntimeException ex) {
            paymentService.markStripeCheckoutFailed(request.getSessionId(), userId, "FINALIZE_FAILED");
            throw ex;
        }
    }

    @PostMapping("/payments/stripe/finalize-foreclosure-checkout")
    public ForeclosurePaymentResponse finalizeForeclosureStripeCheckout(
            @RequestBody StripeCheckoutFinalizeRequest request,
            Authentication authentication
    ) {
        String userId = authentication.getName();
        try {
            ForeclosurePaymentRequest foreclosureRequest = stripePaymentService
                    .buildForeclosurePaymentRequestFromCheckoutSession(request.getSessionId(), userId);
            String idempotencyKey = "stripe-checkout-" + request.getSessionId();
            return paymentService.payForeclosure(foreclosureRequest, userId, idempotencyKey);
        } catch (RuntimeException ex) {
            paymentService.markStripeCheckoutFailed(request.getSessionId(), userId, "FINALIZE_FAILED");
            throw ex;
        }
    }

    @PostMapping("/payments/stripe/mark-failed")
    public String markStripeCheckoutFailed(
            @RequestBody StripeCheckoutFinalizeRequest request,
            Authentication authentication
    ) {
        String userId = authentication.getName();
        paymentService.markStripeCheckoutFailed(request.getSessionId(), userId, request.getReason());
        return "Marked failed";
    }

    // EMI payment
    @PostMapping("/payments")
    public String makePayment(
            @RequestBody PaymentRequest request,
            @RequestHeader("Idempotency-Key") String idempotencyKey,
            Authentication authentication
    ) {
        String userId = authentication.getName();
        return paymentService.payInstallment(request, userId, idempotencyKey);
    }

    // Prepayment payment (separate, body-based without new DTO)
    @PostMapping("/prepayments/{requestId}/pay")
    public String payPrepayment(
            @PathVariable("requestId") String requestId,
            @RequestBody Map<String, BigDecimal> body,
            @RequestHeader("Idempotency-Key") String idempotencyKey,
            Authentication authentication
    ) {
        String userId = authentication.getName();

        BigDecimal amount = body.get("amount");
        if (amount == null) {
            throw new IllegalArgumentException("amount is required");
        }

        return paymentService.payApprovedPrepayment(
                requestId,
                userId,
                amount,
                idempotencyKey
        );
    }

    @GetMapping("/payments")
    public Page<Payment> listMyPayments(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String loanId,
            @RequestParam(required = false) String status,
            Authentication authentication
    ) {
        String userId = authentication.getName();
        return paymentQueryService.getMyPayments(userId, loanId, status, page, size);
    }

    @GetMapping("/admin/payments")
    public Page<Payment> listAllPaymentsForAdmin(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(required = false) String loanId,
            @RequestParam(required = false) String userId,
            @RequestParam(required = false) String status
    ) {
        return paymentQueryService.getAllPaymentsForAdmin(loanId, userId, status, page, size);
    }

    @GetMapping("/payments/summary")
    public PaymentSummaryResponse userSummary(
            @RequestParam("loanId") String loanId,
            Authentication authentication
    ) {
        return paymentSummaryService.getUserSummary(loanId, authentication.getName());
    }

    @GetMapping("/admin/payments/summary")
    public PaymentSummaryResponse adminSummary(
            @RequestParam("loanId") String loanId
    ) {
        return paymentSummaryService.getAdminSummary(loanId);
    }

    @GetMapping("/admin/payments/profitability")
    public AdminProfitabilityResponse adminProfitabilitySummary() {
        return paymentSummaryService.getAdminProfitabilitySummary();
    }
}
