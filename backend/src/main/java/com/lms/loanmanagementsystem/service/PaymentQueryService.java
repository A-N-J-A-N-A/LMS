package com.lms.loanmanagementsystem.service;

import com.lms.loanmanagementsystem.model.Payment;
import com.lms.loanmanagementsystem.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import org.bson.types.ObjectId;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import static org.springframework.http.HttpStatus.BAD_REQUEST;

@Service
@RequiredArgsConstructor
public class PaymentQueryService {

    private final PaymentRepository paymentRepository;

    private Pageable buildPageable(int page, int size) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 100);
        return PageRequest.of(
                safePage,
                safeSize,
                Sort.by(Sort.Direction.DESC, "paymentDate")
        );
    }

    public Page<Payment> getMyPayments(
            String userId,
            String loanId,
            String status,
            int page,
            int size
    ) {
        Pageable pageable = buildPageable(page, size);

        if (loanId != null && !loanId.isBlank() && !ObjectId.isValid(loanId)) {
            throw new ResponseStatusException(BAD_REQUEST, "Invalid loanId");
        }

        if (loanId != null && status != null) {
            return paymentRepository
                    .findByUserIdAndApplicationIdAndStatus(userId, loanId, status, pageable);
        }

        if (loanId != null) {
            return paymentRepository
                    .findByUserIdAndApplicationId(userId, loanId, pageable);
        }

        if (status != null) {
            return paymentRepository
                    .findByUserIdAndStatus(userId, status, pageable);
        }

        return paymentRepository.findByUserId(userId, pageable);
    }

    public Page<Payment> getAllPaymentsForAdmin(
            String loanId,
            String userId,
            String status,
            int page,
            int size
    ) {
        Pageable pageable = buildPageable(page, size);

        if (loanId != null && !loanId.isBlank() && !ObjectId.isValid(loanId)) {
            throw new ResponseStatusException(BAD_REQUEST, "Invalid loanId");
        }

        if (userId != null && !userId.isBlank() && !ObjectId.isValid(userId)) {
            throw new ResponseStatusException(BAD_REQUEST, "Invalid userId");
        }

        if (loanId != null && status != null) {
            return paymentRepository.findByApplicationIdAndStatus(loanId, status, pageable);
        }

        if (userId != null && status != null) {
            return paymentRepository.findByUserIdAndStatus(userId, status, pageable);
        }

        if (loanId != null) {
            return paymentRepository.findByApplicationId(loanId, pageable);
        }

        if (userId != null) {
            return paymentRepository.findByUserId(userId, pageable);
        }

        if (status != null) {
            return paymentRepository.findByStatus(status, pageable);
        }

        return paymentRepository.findAll(pageable);
    }
}
