package com.lms.loanmanagementsystem.service;

import com.lms.loanmanagementsystem.model.AuditLog;
import com.lms.loanmanagementsystem.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;
    private static final String GENESIS_HASH = "0000000000000000000000000000000000000000000000000000000000000000";
    private static final DateTimeFormatter AUDIT_TIME_FORMATTER = DateTimeFormatter.ISO_OFFSET_DATE_TIME;

    public synchronized void log(AuditLog log) {
        AuditLog previous = auditLogRepository.findTopByOrderByAuditSequenceDesc();
        long nextSequence = previous == null || previous.getAuditSequence() == null
                ? 1L
                : previous.getAuditSequence() + 1L;
        String previousHash = previous == null || previous.getCurrentHash() == null || previous.getCurrentHash().isBlank()
                ? GENESIS_HASH
                : previous.getCurrentHash();

        log.setId(null);
        log.setAuditSequence(nextSequence);
        log.setPreviousHash(previousHash);
        log.setCreatedAt(OffsetDateTime.now(ZoneOffset.UTC).format(AUDIT_TIME_FORMATTER));
        log.setCurrentHash(calculateHash(log));
        auditLogRepository.insert(log);
    }

    public List<AuditLog> getLogsForUser(String userId) {
        return auditLogRepository.findByUserId(userId);
    }

    public List<AuditLog> getAllLogs() {
        return auditLogRepository.findAll();
    }

    private String calculateHash(AuditLog log) {
        try {
            String payload = String.join("|",
                    Objects.toString(log.getAuditSequence(), ""),
                    Objects.toString(log.getCorrelationId(), ""),
                    Objects.toString(log.getUserId(), ""),
                    Objects.toString(log.getAction(), ""),
                    Objects.toString(log.getResourceType(), ""),
                    Objects.toString(log.getRequestPayloadMasked(), ""),
                    Objects.toString(log.getResponsePayloadMasked(), ""),
                    Objects.toString(log.getHttpStatus(), ""),
                    Objects.toString(log.isSuccess(), ""),
                    Objects.toString(log.getCreatedAt(), ""),
                    Objects.toString(log.getPreviousHash(), "")
            );
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(payload.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder();
            for (byte b : hash) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to build audit hash", ex);
        }
    }
}
