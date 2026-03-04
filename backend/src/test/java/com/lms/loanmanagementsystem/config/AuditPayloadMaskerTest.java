package com.lms.loanmanagementsystem.config;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AuditPayloadMaskerTest {

    private final AuditPayloadMasker masker = new AuditPayloadMasker();

    @Test
    void shouldMaskSensitiveFieldsInJsonPayload() {
        String payload = "{\"email\":\"a@b.com\",\"password\":\"Secret123\",\"panCard\":\"ABCDE1234F\"}";

        String masked = masker.maskAndTruncate(payload, "application/json", 500);

        assertTrue(masked.contains("\"password\":\"****t123\""));
        assertTrue(masked.contains("\"panCard\":\"****234F\""));
        assertTrue(masked.contains("\"email\":\"a@b.com\""));
    }

    @Test
    void shouldTruncateLargePayload() {
        String payload = "{\"token\":\"abcdefghijklmnopqrstuvwxyz\"}";

        String masked = masker.maskAndTruncate(payload, "application/json", 15);

        assertTrue(masked.endsWith("...[TRUNCATED]"));
    }

    @Test
    void shouldMaskJsonLikeTextWhenContentTypeIsNotJson() {
        String payload = "{\"password\":\"Secret123\"}";

        String masked = masker.maskAndTruncate(payload, "text/plain", 500);

        assertTrue(masked.contains("\"password\":\"****\""));
        assertFalse(masked.contains("Secret123"));
    }
}
