package com.lms.loanmanagementsystem.model;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "audit_logs")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditLog {

    @Id
    private String id;

    private Long auditSequence;
    private String correlationId;
    private String userId;
    private String action;
    private String resourceType;
    private String requestPayloadMasked;
    private String responsePayloadMasked;
    private Integer httpStatus;
    private boolean success;
    private String createdAt;
    private String previousHash;
    private String currentHash;

    // Optional context fields
    private String httpMethod;
    private String apiPath;
    private String ipAddress;
    private Long durationMs;
}
