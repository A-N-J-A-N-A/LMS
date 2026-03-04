package com.lms.loanmanagementsystem.service;

import com.lms.loanmanagementsystem.dto.ApplyLoanRequest;
import com.lms.loanmanagementsystem.model.KycStatus;
import com.lms.loanmanagementsystem.model.LoanType;
import com.lms.loanmanagementsystem.model.User;
import com.lms.loanmanagementsystem.repository.*;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class LoanServiceTest {

    @Mock
    private LoanTypeRepository loanTypeRepository;

    @Mock
    private LoanApplicationRepository loanApplicationRepository;

    @Mock
    private LoanDescriptionRepository loanDescriptionRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private IdempotencyRepository idempotencyRepository;

    @Mock
    private TransactionLedgerRepository transactionLedgerRepository;

    @Mock
    private RepaymentScheduleRepository repaymentScheduleRepository;

    @Mock
    private AppNotificationService appNotificationService;

    @InjectMocks
    private LoanService loanService;

    @Test
    void shouldFailWhenAmountBelowMin() {
        String userId = "507f1f77bcf86cd799439012";
        String loanTypeId = "507f1f77bcf86cd799439011";

        // Mock verified user
        User user = User.builder()
                .id(userId)
                .kycStatus(KycStatus.VERIFIED)
                .build();

        when(userRepository.findById(userId))
                .thenReturn(Optional.of(user));

        // Mock loan type
        LoanType loanType = LoanType.builder()
                .id(loanTypeId)
                .minAmount(BigDecimal.valueOf(50000))
                .maxAmount(BigDecimal.valueOf(500000))
                .minTenure(6)
                .maxTenure(36)
                .status("ACTIVE")
                .build();

        when(loanTypeRepository.findByIdAndStatus(loanTypeId, "ACTIVE"))
                .thenReturn(Optional.of(loanType));

        // No idempotency record
        when(idempotencyRepository.findByIdempotencyKey("key-123"))
                .thenReturn(Optional.empty());

        ApplyLoanRequest request = new ApplyLoanRequest();
        request.setLoanTypeId(loanTypeId);
        request.setAmount(BigDecimal.valueOf(1000)); // below min
        request.setTenure(12);

        assertThrows(ResponseStatusException.class,
                () -> loanService.applyLoan(request, userId, "key-123"));
    }
}
