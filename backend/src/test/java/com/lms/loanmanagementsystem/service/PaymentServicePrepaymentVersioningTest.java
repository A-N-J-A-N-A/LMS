package com.lms.loanmanagementsystem.service;

import com.lms.loanmanagementsystem.dto.PaymentRequest;
import com.lms.loanmanagementsystem.dto.RepaymentScheduleItem;
import com.lms.loanmanagementsystem.model.*;
import com.lms.loanmanagementsystem.repository.*;
import com.stripe.model.PaymentIntent;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaymentServicePrepaymentVersioningTest {

    @Mock private PaymentRepository paymentRepository;
    @Mock private LoanApplicationRepository loanApplicationRepository;
    @Mock private RepaymentScheduleRepository repaymentScheduleRepository;
    @Mock private TransactionLedgerRepository transactionLedgerRepository;
    @Mock private PrepaymentRequestRepository prepaymentRequestRepository;
    @Mock private ForeclosureRequestService foreclosureRequestService;
    @Mock private UserRepository userRepository;
    @Mock private LoanTypeRepository loanTypeRepository;
    @Mock private StripePaymentService stripePaymentService;

    @InjectMocks
    private PaymentService paymentService;

    @Test
    void shouldCloseActiveScheduleAndCreateNewVersionWhenApprovedPrepaymentIsConsumed() {
        String loanId = "507f1f77bcf86cd799439011";
        String userId = "user-1";

        PaymentRequest request = new PaymentRequest();
        request.setApplicationId(loanId);
        request.setInstallmentNo(1);
        request.setAmount(BigDecimal.valueOf(1000));
        request.setPaymentIntentId("pi_test_1");

        LoanApplication loan = LoanApplication.builder()
                .id(loanId)
                .userId(userId)
                .loanTypeId("HOME")
                .status(LoanStatus.DISBURSED)
                .disbursedAmount(BigDecimal.valueOf(100000))
                .build();

        RepaymentScheduleItem item1 = new RepaymentScheduleItem(
                1, "2099-01-01", BigDecimal.valueOf(1200),
                BigDecimal.valueOf(1100), BigDecimal.valueOf(100),
                BigDecimal.valueOf(1200), BigDecimal.valueOf(98900), "upcoming"
        );

        RepaymentScheduleDoc active = RepaymentScheduleDoc.builder()
                .id("schedule-v1")
                .loanApplicationId(loanId)
                .version(1)
                .status("ACTIVE")
                .items(List.of(item1))
                .build();

        PrepaymentRequest approvedPrepayment = PrepaymentRequest.builder()
                .id("prepay-1")
                .loanApplicationId(loanId)
                .userId(userId)
                .requestedAmount(BigDecimal.valueOf(1000))
                .status(PrepaymentRequestStatus.APPROVED)
                .consumed(false)
                .reviewedBy("admin-1")
                .build();

        Payment savedPayment = new Payment();
        savedPayment.setId("payment-1");

        PaymentIntent intent = mock(PaymentIntent.class);
        when(intent.getStatus()).thenReturn("succeeded");
        when(intent.getAmountReceived()).thenReturn(100000L);
        when(intent.getMetadata()).thenReturn(Map.of(
                "applicationId", loanId,
                "installmentNo", "1",
                "userId", userId
        ));

        when(paymentRepository.findByIdempotencyKey("idem-1")).thenReturn(Optional.empty());
        when(loanApplicationRepository.findById(loanId)).thenReturn(Optional.of(loan));
        when(repaymentScheduleRepository.findByLoanApplicationIdAndStatus(loanId, "ACTIVE"))
                .thenReturn(Optional.of(active));
        when(prepaymentRequestRepository.findByUserIdAndLoanApplicationIdAndStatusOrderByReviewedAtDesc(
                userId, loanId, PrepaymentRequestStatus.APPROVED
        )).thenReturn(List.of(approvedPrepayment));
        when(stripePaymentService.fetchPaymentIntent("pi_test_1")).thenReturn(intent);
        when(paymentRepository.existsByApplicationIdAndInstallmentNoAndStatus(loanId, 1, "SUCCESS"))
                .thenReturn(false);
        when(paymentRepository.save(any(Payment.class))).thenReturn(savedPayment);
        when(transactionLedgerRepository.findByLoanId(loanId)).thenReturn(List.of());
        when(repaymentScheduleRepository.findTopByLoanApplicationIdOrderByVersionDesc(loanId))
                .thenReturn(Optional.of(active));

        String result = paymentService.payInstallment(request, userId, "idem-1");

        assertEquals("Payment Successful", result);

        ArgumentCaptor<RepaymentScheduleDoc> scheduleCaptor =
                ArgumentCaptor.forClass(RepaymentScheduleDoc.class);
        verify(repaymentScheduleRepository, times(2)).save(scheduleCaptor.capture());

        List<RepaymentScheduleDoc> savedSchedules = scheduleCaptor.getAllValues();
        assertEquals("CLOSED", savedSchedules.get(0).getStatus());

        RepaymentScheduleDoc newVersion = savedSchedules.get(1);
        assertEquals("ACTIVE", newVersion.getStatus());
        assertEquals(2, newVersion.getVersion());
        assertEquals("PREPAYMENT", newVersion.getReason());
        assertEquals(loanId, newVersion.getLoanApplicationId());
        assertTrue(newVersion.getItems() != null && !newVersion.getItems().isEmpty());
    }


    @Test
    void shouldAllowWalletPaymentAndDebitWalletBalance() {
        String loanId = "507f1f77bcf86cd799439013";
        String userId = "user-3";

        PaymentRequest request = new PaymentRequest();
        request.setApplicationId(loanId);
        request.setInstallmentNo(1);
        request.setAmount(BigDecimal.valueOf(1000));
        request.setUseWallet(true);

        LoanApplication loan = LoanApplication.builder()
                .id(loanId)
                .userId(userId)
                .loanTypeId("HOME")
                .status(LoanStatus.DISBURSED)
                .disbursedAmount(BigDecimal.valueOf(100000))
                .build();

        RepaymentScheduleItem item1 = new RepaymentScheduleItem(
                1, "2099-01-01", BigDecimal.valueOf(1000),
                BigDecimal.valueOf(900), BigDecimal.valueOf(100),
                BigDecimal.valueOf(1000), BigDecimal.valueOf(99100), "upcoming"
        );

        RepaymentScheduleDoc active = RepaymentScheduleDoc.builder()
                .id("schedule-v1-wallet-debit")
                .loanApplicationId(loanId)
                .version(1)
                .status("ACTIVE")
                .items(List.of(item1))
                .build();

        User user = User.builder()
                .id(userId)
                .walletBalance(BigDecimal.valueOf(1500))
                .build();

        Payment savedPayment = new Payment();
        savedPayment.setId("payment-3");

        when(paymentRepository.findByIdempotencyKey("idem-3")).thenReturn(Optional.empty());
        when(loanApplicationRepository.findById(loanId)).thenReturn(Optional.of(loan));
        when(repaymentScheduleRepository.findByLoanApplicationIdAndStatus(loanId, "ACTIVE"))
                .thenReturn(Optional.of(active));
        when(prepaymentRequestRepository.findByUserIdAndLoanApplicationIdAndStatusOrderByReviewedAtDesc(
                userId, loanId, PrepaymentRequestStatus.APPROVED
        )).thenReturn(List.of());
        when(paymentRepository.existsByApplicationIdAndInstallmentNoAndStatus(loanId, 1, "SUCCESS"))
                .thenReturn(false);
        when(paymentRepository.save(any(Payment.class))).thenReturn(savedPayment);
        when(transactionLedgerRepository.findByLoanId(loanId)).thenReturn(List.of());
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        String result = paymentService.payInstallment(request, userId, "idem-3");

        assertEquals("Payment Successful", result);

        verify(stripePaymentService, never()).fetchPaymentIntent(any());
        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());
        assertEquals(BigDecimal.valueOf(500.00).setScale(2), userCaptor.getValue().getWalletBalance());
    }

    @Test
    void shouldAllowApprovedPrepaymentAmountHigherThanScheduledEmiWithExactMatch() {
        String loanId = "507f1f77bcf86cd799439015";
        String userId = "user-5";

        PaymentRequest request = new PaymentRequest();
        request.setApplicationId(loanId);
        request.setInstallmentNo(1);
        request.setAmount(BigDecimal.valueOf(1500));
        request.setPaymentIntentId("pi_test_5");

        LoanApplication loan = LoanApplication.builder()
                .id(loanId)
                .userId(userId)
                .loanTypeId("HOME")
                .status(LoanStatus.DISBURSED)
                .disbursedAmount(BigDecimal.valueOf(100000))
                .build();

        RepaymentScheduleItem item1 = new RepaymentScheduleItem(
                1, "2099-01-01", BigDecimal.valueOf(1000),
                BigDecimal.valueOf(900), BigDecimal.valueOf(100),
                BigDecimal.valueOf(1000), BigDecimal.valueOf(99100), "upcoming"
        );

        RepaymentScheduleDoc active = RepaymentScheduleDoc.builder()
                .id("schedule-v1-prepay-higher")
                .loanApplicationId(loanId)
                .version(1)
                .status("ACTIVE")
                .items(List.of(item1))
                .build();

        PrepaymentRequest approvedPrepayment = PrepaymentRequest.builder()
                .id("prepay-5")
                .loanApplicationId(loanId)
                .userId(userId)
                .requestedAmount(BigDecimal.valueOf(1500))
                .status(PrepaymentRequestStatus.APPROVED)
                .consumed(false)
                .reviewedBy("admin-1")
                .build();

        Payment savedPayment = new Payment();
        savedPayment.setId("payment-5");

        PaymentIntent intent = mock(PaymentIntent.class);
        when(intent.getStatus()).thenReturn("succeeded");
        when(intent.getAmountReceived()).thenReturn(150000L);
        when(intent.getMetadata()).thenReturn(Map.of(
                "applicationId", loanId,
                "installmentNo", "1",
                "userId", userId
        ));

        when(paymentRepository.findByIdempotencyKey("idem-5")).thenReturn(Optional.empty());
        when(loanApplicationRepository.findById(loanId)).thenReturn(Optional.of(loan));
        when(repaymentScheduleRepository.findByLoanApplicationIdAndStatus(loanId, "ACTIVE"))
                .thenReturn(Optional.of(active));
        when(prepaymentRequestRepository.findByUserIdAndLoanApplicationIdAndStatusOrderByReviewedAtDesc(
                userId, loanId, PrepaymentRequestStatus.APPROVED
        )).thenReturn(List.of(approvedPrepayment));
        when(stripePaymentService.fetchPaymentIntent("pi_test_5")).thenReturn(intent);
        when(paymentRepository.existsByApplicationIdAndInstallmentNoAndStatus(loanId, 1, "SUCCESS"))
                .thenReturn(false);
        when(paymentRepository.save(any(Payment.class))).thenReturn(savedPayment);
        when(transactionLedgerRepository.findByLoanId(loanId)).thenReturn(List.of());
        when(repaymentScheduleRepository.findTopByLoanApplicationIdOrderByVersionDesc(loanId))
                .thenReturn(Optional.of(active));

        String result = paymentService.payInstallment(request, userId, "idem-5");

        assertEquals("Payment Successful", result);
        verify(repaymentScheduleRepository, times(2)).save(any(RepaymentScheduleDoc.class));
    }

    @Test
    void shouldForecloseLoanAndCreditExcessToWallet() {
        String loanId = "507f1f77bcf86cd799439016";
        String userId = "user-6";

        LoanApplication loan = LoanApplication.builder()
                .id(loanId)
                .userId(userId)
                .loanTypeId("HOME")
                .status(LoanStatus.DISBURSED)
                .disbursedAmount(BigDecimal.valueOf(5000))
                .build();

        RepaymentScheduleItem item1 = new RepaymentScheduleItem(
                1, "2099-01-01", BigDecimal.valueOf(1000),
                BigDecimal.valueOf(900), BigDecimal.valueOf(100),
                BigDecimal.valueOf(1000), BigDecimal.valueOf(4000), "upcoming"
        );
        RepaymentScheduleItem item2 = new RepaymentScheduleItem(
                2, "2099-02-01", BigDecimal.valueOf(800),
                BigDecimal.valueOf(700), BigDecimal.valueOf(100),
                BigDecimal.valueOf(800), BigDecimal.valueOf(3200), "upcoming"
        );

        RepaymentScheduleDoc active = RepaymentScheduleDoc.builder()
                .id("schedule-v1-foreclose")
                .loanApplicationId(loanId)
                .version(1)
                .status("ACTIVE")
                .items(List.of(item1, item2))
                .build();

        Payment savedPayment = new Payment();
        savedPayment.setId("payment-6");

        User user = User.builder()
                .id(userId)
                .walletBalance(BigDecimal.valueOf(50))
                .build();

        com.lms.loanmanagementsystem.dto.ForeclosurePaymentRequest request =
                new com.lms.loanmanagementsystem.dto.ForeclosurePaymentRequest();
        request.setApplicationId(loanId);
        request.setAmount(BigDecimal.valueOf(2000));
        request.setUseWallet(false);

        when(paymentRepository.findByIdempotencyKey("idem-6")).thenReturn(Optional.empty());
        when(loanApplicationRepository.findById(loanId)).thenReturn(Optional.of(loan));
        when(repaymentScheduleRepository.findByLoanApplicationIdAndStatus(loanId, "ACTIVE"))
                .thenReturn(Optional.of(active));
        when(paymentRepository.save(any(Payment.class))).thenReturn(savedPayment);
        when(transactionLedgerRepository.findByLoanId(loanId)).thenReturn(List.of());
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(foreclosureRequestService.getApprovedUnconsumedRequest(userId, loanId)).thenReturn(
                ForeclosureRequest.builder()
                        .id("foreclosure-1")
                        .loanApplicationId(loanId)
                        .userId(userId)
                        .status(ForeclosureRequestStatus.APPROVED)
                        .consumed(false)
                        .build()
        );

        com.lms.loanmanagementsystem.dto.ForeclosurePaymentResponse result =
                paymentService.payForeclosure(request, userId, "idem-6");

        assertNotNull(result);
        assertEquals("Foreclosure Successful", result.getMessage());
        assertEquals(BigDecimal.valueOf(1800.00).setScale(2), result.getAmountAppliedToLoan());
        assertEquals(BigDecimal.valueOf(200.00).setScale(2), result.getWalletCredited());
        assertEquals(LoanStatus.CLOSED, result.getLoanStatus());

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());
        assertEquals(BigDecimal.valueOf(250.00).setScale(2), userCaptor.getValue().getWalletBalance());
        verify(foreclosureRequestService).markConsumed(any(ForeclosureRequest.class), eq("payment-6"));
    }

}
