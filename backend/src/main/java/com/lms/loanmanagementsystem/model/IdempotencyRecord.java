package com.lms.loanmanagementsystem.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "idempotency_keys")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IdempotencyRecord {

    @Id
    private String id;

    @Indexed(unique = true)
    private String idempotencyKey;

    private String userId;
    private String requestHash;

    private String responseBody; // JSON serialized response
    private Integer httpStatus;

    private LocalDateTime createdAt;
    @Indexed(expireAfterSeconds = 0)
    private LocalDateTime expiresAt;
}
