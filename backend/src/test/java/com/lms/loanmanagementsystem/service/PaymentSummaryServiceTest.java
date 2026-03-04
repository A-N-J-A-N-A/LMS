package com.lms.loanmanagementsystem.service;

import com.lms.loanmanagementsystem.dto.AdminProfitabilityResponse;
import com.lms.loanmanagementsystem.dto.LoanTypeProfitabilityItem;
import com.lms.loanmanagementsystem.model.LoanApplication;
import com.lms.loanmanagementsystem.model.TransactionLedger;
import com.lms.loanmanagementsystem.model.TransactionType;
import com.lms.loanmanagementsystem.model.LoanStatus;
import com.lms.loanmanagementsystem.repository.LoanApplicationRepository;
import com.lms.loanmanagementsystem.repository.RepaymentScheduleRepository;
import com.lms.loanmanagementsystem.repository.TransactionLedgerRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PaymentSummaryServiceTest {

    @Mock
    private LoanApplicationRepository loanApplicationRepository;

    @Mock
    private RepaymentScheduleRepository repaymentScheduleRepository;

    @Mock
    private TransactionLedgerRepository transactionLedgerRepository;

    @InjectMocks
    private PaymentSummaryService paymentSummaryService;

    @Test
    void shouldCalculateProfitabilityByLoanType() {
        TransactionLedger emiHome = TransactionLedger.builder()
                .loanId("loan-1")
                .transactionType(TransactionType.EMI_PAYMENT)
                .amount(BigDecimal.valueOf(1200))
                .interestComponent(BigDecimal.valueOf(1200))
                .build();

        TransactionLedger emiCar = TransactionLedger.builder()
                .loanId("loan-2")
                .transactionType(TransactionType.EMI_PAYMENT)
                .amount(BigDecimal.valueOf(800))
                .interestComponent(BigDecimal.valueOf(800))
                .build();

        TransactionLedger interestHome = TransactionLedger.builder()
                .loanId("loan-1")
                .transactionType(TransactionType.INTEREST)
                .amount(BigDecimal.valueOf(300))
                .build();

        when(transactionLedgerRepository.findAll())
                .thenReturn(List.of(emiHome, emiCar, interestHome));
        when(loanApplicationRepository.findById("loan-1"))
                .thenReturn(Optional.of(LoanApplication.builder()
                        .id("loan-1")
                        .loanTypeId("HOME")
                        .disbursedAmount(BigDecimal.valueOf(100000))
                        .status(LoanStatus.DISBURSED)
                        .build()));
        when(loanApplicationRepository.findById("loan-2"))
                .thenReturn(Optional.of(LoanApplication.builder()
                        .id("loan-2")
                        .loanTypeId("CAR")
                        .disbursedAmount(BigDecimal.valueOf(50000))
                        .status(LoanStatus.CLOSED)
                        .build()));
        when(loanApplicationRepository.findAll()).thenReturn(List.of(
                LoanApplication.builder()
                        .id("loan-1")
                        .loanTypeId("HOME")
                        .disbursedAmount(BigDecimal.valueOf(100000))
                        .status(LoanStatus.DISBURSED)
                        .build(),
                LoanApplication.builder()
                        .id("loan-2")
                        .loanTypeId("CAR")
                        .disbursedAmount(BigDecimal.valueOf(50000))
                        .status(LoanStatus.CLOSED)
                        .build()
        ));

        AdminProfitabilityResponse result = paymentSummaryService.getAdminProfitabilitySummary();

        assertEquals(BigDecimal.valueOf(2300), result.getTotalInterestProfit());
        assertEquals(3L, result.getInterestPaymentCount());
        assertEquals(2, result.getByLoanType().size());

        LoanTypeProfitabilityItem first = result.getByLoanType().get(0);
        LoanTypeProfitabilityItem second = result.getByLoanType().get(1);

        assertEquals("HOME", first.getLoanTypeId());
        assertEquals(BigDecimal.valueOf(1500), first.getInterestProfit());
        assertEquals(2L, first.getPaymentCount());

        assertEquals("CAR", second.getLoanTypeId());
        assertEquals(BigDecimal.valueOf(800), second.getInterestProfit());
        assertEquals(1L, second.getPaymentCount());
        assertEquals(2L, result.getDisbursedLoanCount());
        assertEquals(1L, result.getClosedLoanCount());
        assertEquals(BigDecimal.valueOf(150000), result.getTotalDisbursedAmount());
        assertEquals(BigDecimal.valueOf(2300), result.getTotalPaidBackAmount());
        assertEquals("HOME", result.getMostProfitableLoanType());
        assertEquals(BigDecimal.valueOf(1500), result.getMostProfitableLoanTypeProfit());
    }
}
