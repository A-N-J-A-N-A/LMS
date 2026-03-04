package com.lms.loanmanagementsystem.repository;

import com.lms.loanmanagementsystem.model.Payment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface PaymentRepository extends MongoRepository<Payment, String> {

    Optional<Payment> findByIdempotencyKey(String idempotencyKey);
    Optional<Payment> findByIdempotencyKeyAndUserId(String idempotencyKey, String userId);

    boolean existsByApplicationIdAndInstallmentNoAndStatus(String applicationId, Integer installmentNo, String status);
    boolean existsByApplicationIdAndUserIdAndStatusAndRemarksAndPaymentDateBetween(
            String applicationId,
            String userId,
            String status,
            String remarks,
            LocalDateTime from,
            LocalDateTime to
    );
    List<Payment> findByStatusAndPaymentDateBefore(String status, LocalDateTime before);

    Page<Payment> findByUserId(String userId, Pageable pageable);
    Page<Payment> findByUserIdAndStatus(String userId, String status, Pageable pageable);

    // USER

    Page<Payment> findByUserIdAndApplicationId(String userId, String applicationId, Pageable pageable);
    Page<Payment> findByUserIdAndApplicationIdAndStatus(String userId, String applicationId, String status, Pageable pageable);

    // ADMIN
    Page<Payment> findAll(Pageable pageable);
    Page<Payment> findByApplicationId(String applicationId, Pageable pageable);
    Page<Payment> findByStatus(String status, Pageable pageable);
    Page<Payment> findByApplicationIdAndStatus(String applicationId, String status, Pageable pageable);

}
