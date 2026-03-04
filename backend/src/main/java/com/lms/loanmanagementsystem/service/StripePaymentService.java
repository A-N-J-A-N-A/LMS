package com.lms.loanmanagementsystem.service;

import com.lms.loanmanagementsystem.dto.StripePaymentIntentRequest;
import com.lms.loanmanagementsystem.dto.StripePaymentIntentResponse;
import com.lms.loanmanagementsystem.dto.StripeForeclosureCheckoutSessionRequest;
import com.lms.loanmanagementsystem.dto.ForeclosurePaymentRequest;
import com.stripe.exception.StripeException;
import com.stripe.model.PaymentIntent;
import com.stripe.model.checkout.Session;
import com.stripe.param.PaymentIntentCreateParams;
import com.stripe.param.checkout.SessionCreateParams;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.HashMap;
import java.util.Map;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR;

@Service
@RequiredArgsConstructor
public class StripePaymentService {
    private static final String PAYMENT_TYPE_FORECLOSURE = "FORECLOSURE";

    @Value("${stripe.publishable-key:}")
    private String publishableKey;
    @Value("${stripe.checkout-success-url:http://localhost:3000/payment?action=pay&status=success&session_id={CHECKOUT_SESSION_ID}}")
    private String checkoutSuccessUrl;
    @Value("${stripe.checkout-cancel-url:http://localhost:3000/payment?action=pay&status=cancelled}")
    private String checkoutCancelUrl;

    public StripePaymentIntentResponse createPaymentIntent(
            StripePaymentIntentRequest request,
            String userId
    ) {
        validateRequest(request);

        String currency = request.getCurrency();
        if (currency == null || currency.isBlank()) {
            currency = "inr";
        }

        long amountInSmallestUnit = request.getAmount()
                .multiply(BigDecimal.valueOf(100))
                .setScale(0, RoundingMode.HALF_UP)
                .longValueExact();

        try {
            Map<String, String> metadata = new HashMap<>();
            metadata.put("applicationId", request.getApplicationId());
            metadata.put("installmentNo", String.valueOf(request.getInstallmentNo()));
            metadata.put("userId", userId);

            PaymentIntentCreateParams params = PaymentIntentCreateParams.builder()
                    .setAmount(amountInSmallestUnit)
                    .setCurrency(currency.toLowerCase())
                    .putAllMetadata(metadata)
                    .setAutomaticPaymentMethods(
                            PaymentIntentCreateParams.AutomaticPaymentMethods.builder()
                                    .setEnabled(true)
                                    .build()
                    )
                    .build();

            PaymentIntent intent = PaymentIntent.create(params);
            return new StripePaymentIntentResponse(intent.getClientSecret(), intent.getId());
        } catch (StripeException ex) {
            throw new ResponseStatusException(INTERNAL_SERVER_ERROR, "Unable to create Stripe payment intent");
        }
    }

    public PaymentIntent fetchPaymentIntent(String paymentIntentId) {
        if (paymentIntentId == null || paymentIntentId.isBlank()) {
            throw new ResponseStatusException(BAD_REQUEST, "paymentIntentId is required");
        }
        try {
            return PaymentIntent.retrieve(paymentIntentId);
        } catch (StripeException ex) {
            throw new ResponseStatusException(BAD_REQUEST, "Invalid paymentIntentId");
        }
    }

    public String getPublishableKey() {
        if (publishableKey == null || publishableKey.isBlank()) {
            throw new ResponseStatusException(INTERNAL_SERVER_ERROR, "Stripe publishable key is missing");
        }
        return publishableKey;
    }

    public com.lms.loanmanagementsystem.dto.StripeCheckoutSessionResponse createCheckoutSession(
            com.lms.loanmanagementsystem.dto.StripeCheckoutSessionRequest request,
            String userId
    ) {
        validateRequest(request.getApplicationId(), request.getInstallmentNo(), request.getAmount());

        String currency = request.getCurrency();
        if (currency == null || currency.isBlank()) {
            currency = "inr";
        }

        long amountInSmallestUnit = request.getAmount()
                .multiply(BigDecimal.valueOf(100))
                .setScale(0, RoundingMode.HALF_UP)
                .longValueExact();

        try {
            SessionCreateParams.LineItem.PriceData.ProductData productData =
                    SessionCreateParams.LineItem.PriceData.ProductData.builder()
                            .setName("Loan EMI Repayment")
                            .setDescription("Installment " + request.getInstallmentNo())
                            .build();

            SessionCreateParams.LineItem.PriceData priceData =
                    SessionCreateParams.LineItem.PriceData.builder()
                            .setCurrency(currency.toLowerCase())
                            .setUnitAmount(amountInSmallestUnit)
                            .setProductData(productData)
                            .build();

            SessionCreateParams.PaymentIntentData paymentIntentData =
                    SessionCreateParams.PaymentIntentData.builder()
                            .putMetadata("applicationId", request.getApplicationId())
                            .putMetadata("installmentNo", String.valueOf(request.getInstallmentNo()))
                            .putMetadata("userId", userId)
                            .build();

            String successUrlWithApp = appendQueryParam(checkoutSuccessUrl, "applicationId", request.getApplicationId());
            String cancelUrlWithApp = appendQueryParam(checkoutCancelUrl, "applicationId", request.getApplicationId());

            SessionCreateParams.Builder paramsBuilder = SessionCreateParams.builder()
                    .setMode(SessionCreateParams.Mode.PAYMENT)
                    .setSuccessUrl(successUrlWithApp)
                    .setCancelUrl(cancelUrlWithApp)
                    .setPaymentIntentData(paymentIntentData)
                    .addLineItem(
                            SessionCreateParams.LineItem.builder()
                                    .setQuantity(1L)
                                    .setPriceData(priceData)
                                    .build()
                    );

            if (request.getCustomerEmail() != null && !request.getCustomerEmail().isBlank()) {
                paramsBuilder.setCustomerEmail(request.getCustomerEmail());
            }

            Session session = Session.create(paramsBuilder.build());
            return new com.lms.loanmanagementsystem.dto.StripeCheckoutSessionResponse(
                    session.getId(),
                    session.getUrl()
            );
        } catch (StripeException ex) {
            throw new ResponseStatusException(INTERNAL_SERVER_ERROR, "Unable to create Stripe checkout session");
        }
    }

    public com.lms.loanmanagementsystem.dto.StripeCheckoutSessionResponse createForeclosureCheckoutSession(
            StripeForeclosureCheckoutSessionRequest request,
            String userId
    ) {
        if (request == null) {
            throw new ResponseStatusException(BAD_REQUEST, "Invalid request");
        }
        if (request.getApplicationId() == null || request.getApplicationId().isBlank()) {
            throw new ResponseStatusException(BAD_REQUEST, "applicationId is required");
        }
        if (request.getAmount() == null || request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new ResponseStatusException(BAD_REQUEST, "amount must be greater than zero");
        }

        String currency = request.getCurrency();
        if (currency == null || currency.isBlank()) {
            currency = "inr";
        }

        long amountInSmallestUnit = request.getAmount()
                .multiply(BigDecimal.valueOf(100))
                .setScale(0, RoundingMode.HALF_UP)
                .longValueExact();

        try {
            SessionCreateParams.LineItem.PriceData.ProductData productData =
                    SessionCreateParams.LineItem.PriceData.ProductData.builder()
                            .setName("Loan Foreclosure")
                            .setDescription("Foreclosure settlement")
                            .build();

            SessionCreateParams.LineItem.PriceData priceData =
                    SessionCreateParams.LineItem.PriceData.builder()
                            .setCurrency(currency.toLowerCase())
                            .setUnitAmount(amountInSmallestUnit)
                            .setProductData(productData)
                            .build();

            SessionCreateParams.PaymentIntentData paymentIntentData =
                    SessionCreateParams.PaymentIntentData.builder()
                            .putMetadata("applicationId", request.getApplicationId())
                            .putMetadata("paymentType", PAYMENT_TYPE_FORECLOSURE)
                            .putMetadata("userId", userId)
                            .build();

            String successUrlWithApp = appendQueryParam(checkoutSuccessUrl, "applicationId", request.getApplicationId());
            successUrlWithApp = appendQueryParam(successUrlWithApp, "action", "foreclosure");
            String cancelUrlWithApp = appendQueryParam(checkoutCancelUrl, "applicationId", request.getApplicationId());
            cancelUrlWithApp = appendQueryParam(cancelUrlWithApp, "action", "foreclosure");

            SessionCreateParams.Builder paramsBuilder = SessionCreateParams.builder()
                    .setMode(SessionCreateParams.Mode.PAYMENT)
                    .setSuccessUrl(successUrlWithApp)
                    .setCancelUrl(cancelUrlWithApp)
                    .setPaymentIntentData(paymentIntentData)
                    .addLineItem(
                            SessionCreateParams.LineItem.builder()
                                    .setQuantity(1L)
                                    .setPriceData(priceData)
                                    .build()
                    );

            if (request.getCustomerEmail() != null && !request.getCustomerEmail().isBlank()) {
                paramsBuilder.setCustomerEmail(request.getCustomerEmail());
            }

            Session session = Session.create(paramsBuilder.build());
            return new com.lms.loanmanagementsystem.dto.StripeCheckoutSessionResponse(
                    session.getId(),
                    session.getUrl()
            );
        } catch (StripeException ex) {
            throw new ResponseStatusException(INTERNAL_SERVER_ERROR, "Unable to create Stripe checkout session");
        }
    }

    public com.lms.loanmanagementsystem.dto.PaymentRequest buildPaymentRequestFromCheckoutSession(
            String sessionId,
            String userId
    ) {
        if (sessionId == null || sessionId.isBlank()) {
            throw new ResponseStatusException(BAD_REQUEST, "sessionId is required");
        }

        try {
            Session session = Session.retrieve(sessionId);
            if (!"paid".equalsIgnoreCase(session.getPaymentStatus())) {
                throw new ResponseStatusException(BAD_REQUEST, "Stripe checkout session is not paid");
            }

            String paymentIntentId = session.getPaymentIntent();
            PaymentIntent intent = fetchPaymentIntent(paymentIntentId);

            if (!"succeeded".equalsIgnoreCase(intent.getStatus())) {
                throw new ResponseStatusException(BAD_REQUEST, "Stripe payment is not completed");
            }

            String metadataApplicationId = intent.getMetadata().get("applicationId");
            String metadataInstallment = intent.getMetadata().get("installmentNo");
            String metadataUserId = intent.getMetadata().get("userId");
            if (metadataApplicationId == null || metadataInstallment == null || metadataUserId == null) {
                throw new ResponseStatusException(BAD_REQUEST, "Stripe payment metadata is incomplete");
            }
            if (!userId.equals(metadataUserId)) {
                throw new ResponseStatusException(BAD_REQUEST, "Stripe checkout user mismatch");
            }

            BigDecimal amount = BigDecimal.valueOf(intent.getAmountReceived())
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);

            com.lms.loanmanagementsystem.dto.PaymentRequest paymentRequest =
                    new com.lms.loanmanagementsystem.dto.PaymentRequest();
            paymentRequest.setApplicationId(metadataApplicationId);
            paymentRequest.setInstallmentNo(Integer.valueOf(metadataInstallment));
            paymentRequest.setAmount(amount);
            paymentRequest.setPaymentIntentId(paymentIntentId);
            return paymentRequest;
        } catch (StripeException ex) {
            throw new ResponseStatusException(BAD_REQUEST, "Invalid Stripe checkout session");
        }
    }

    public ForeclosurePaymentRequest buildForeclosurePaymentRequestFromCheckoutSession(
            String sessionId,
            String userId
    ) {
        if (sessionId == null || sessionId.isBlank()) {
            throw new ResponseStatusException(BAD_REQUEST, "sessionId is required");
        }

        try {
            Session session = Session.retrieve(sessionId);
            if (!"paid".equalsIgnoreCase(session.getPaymentStatus())) {
                throw new ResponseStatusException(BAD_REQUEST, "Stripe checkout session is not paid");
            }

            String paymentIntentId = session.getPaymentIntent();
            PaymentIntent intent = fetchPaymentIntent(paymentIntentId);
            if (!"succeeded".equalsIgnoreCase(intent.getStatus())) {
                throw new ResponseStatusException(BAD_REQUEST, "Stripe payment is not completed");
            }

            String metadataApplicationId = intent.getMetadata().get("applicationId");
            String metadataPaymentType = intent.getMetadata().get("paymentType");
            String metadataUserId = intent.getMetadata().get("userId");
            if (metadataApplicationId == null || metadataPaymentType == null || metadataUserId == null) {
                throw new ResponseStatusException(BAD_REQUEST, "Stripe payment metadata is incomplete");
            }
            if (!PAYMENT_TYPE_FORECLOSURE.equalsIgnoreCase(metadataPaymentType)) {
                throw new ResponseStatusException(BAD_REQUEST, "Stripe checkout is not a foreclosure payment");
            }
            if (!userId.equals(metadataUserId)) {
                throw new ResponseStatusException(BAD_REQUEST, "Stripe checkout user mismatch");
            }

            BigDecimal amount = BigDecimal.valueOf(intent.getAmountReceived())
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);

            ForeclosurePaymentRequest request = new ForeclosurePaymentRequest();
            request.setApplicationId(metadataApplicationId);
            request.setAmount(amount);
            request.setUseWallet(false);
            return request;
        } catch (StripeException ex) {
            throw new ResponseStatusException(BAD_REQUEST, "Invalid Stripe checkout session");
        }
    }

    private void validateRequest(StripePaymentIntentRequest request) {
        if (request == null) {
            throw new ResponseStatusException(BAD_REQUEST, "Invalid request");
        }
        validateRequest(request.getApplicationId(), request.getInstallmentNo(), request.getAmount());
    }

    private void validateRequest(String applicationId, Integer installmentNo, BigDecimal amount) {
        if (applicationId == null || applicationId.isBlank()) {
            throw new ResponseStatusException(BAD_REQUEST, "applicationId is required");
        }
        if (installmentNo == null || installmentNo <= 0) {
            throw new ResponseStatusException(BAD_REQUEST, "installmentNo is required");
        }
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new ResponseStatusException(BAD_REQUEST, "amount must be greater than zero");
        }
    }

    private String appendQueryParam(String url, String key, String value) {
        if (url == null || url.isBlank()) {
            return url;
        }
        String separator = url.contains("?") ? "&" : "?";
        return url + separator + key + "=" + value;
    }
}
