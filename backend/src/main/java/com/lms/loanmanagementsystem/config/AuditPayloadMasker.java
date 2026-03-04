package com.lms.loanmanagementsystem.config;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.stereotype.Component;

import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

@Component
public class AuditPayloadMasker {

    private static final Set<String> SENSITIVE_KEYWORDS = Set.of(
            "password",
            "token",
            "secret",
            "authorization",
            "api_key",
            "apikey",
            "pan",
            "aadhaar",
            "ssn",
            "card",
            "cvv",
            "account",
            "ifsc",
            "otp",
            "pin"
    );

    private static final Pattern JSON_KEY_VALUE_PATTERN = Pattern.compile(
            "(?i)(\"(?:password|token|secret|authorization|api[_-]?key|pan(?:Card)?|aadhaar(?:Card)?|ssn|card(?:Number)?|cvv|account(?:Number)?|ifsc|otp|pin)\"\\s*:\\s*)\"([^\"]*)\""
    );

    private final ObjectMapper objectMapper = new ObjectMapper();

    public String maskAndTruncate(String payload, String contentType, int maxLength) {
        if (payload == null || payload.isBlank()) {
            return null;
        }

        String masked = isJsonContent(contentType) ? maskJson(payload) : maskText(payload);
        if (maxLength > 0 && masked.length() > maxLength) {
            return masked.substring(0, maxLength) + "...[TRUNCATED]";
        }
        return masked;
    }

    private boolean isJsonContent(String contentType) {
        if (contentType == null) {
            return false;
        }
        String normalized = contentType.toLowerCase(Locale.ROOT);
        return normalized.contains("application/json") || normalized.contains("+json");
    }

    private String maskJson(String payload) {
        try {
            JsonNode root = objectMapper.readTree(payload);
            maskNode(root);
            return objectMapper.writeValueAsString(root);
        } catch (Exception ex) {
            return maskText(payload);
        }
    }

    private void maskNode(JsonNode node) {
        if (node == null) {
            return;
        }
        if (node.isObject()) {
            ObjectNode objectNode = (ObjectNode) node;
            objectNode.fieldNames().forEachRemaining(fieldName -> {
                JsonNode child = objectNode.get(fieldName);
                if (isSensitiveKey(fieldName)) {
                    if (child == null || child.isNull()) {
                        return;
                    }
                    if (child.isTextual() || child.isNumber() || child.isBoolean()) {
                        objectNode.put(fieldName, maskScalar(child.asText()));
                    } else {
                        objectNode.put(fieldName, "[MASKED]");
                    }
                } else {
                    maskNode(child);
                }
            });
            return;
        }
        if (node.isArray()) {
            ArrayNode arrayNode = (ArrayNode) node;
            for (JsonNode child : arrayNode) {
                maskNode(child);
            }
        }
    }

    private boolean isSensitiveKey(String key) {
        String normalized = key.toLowerCase(Locale.ROOT);
        for (String keyword : SENSITIVE_KEYWORDS) {
            if (normalized.contains(keyword)) {
                return true;
            }
        }
        return false;
    }

    private String maskText(String payload) {
        return JSON_KEY_VALUE_PATTERN.matcher(payload).replaceAll("$1\"****\"");
    }

    private String maskScalar(String value) {
        if (value == null || value.isBlank()) {
            return "****";
        }
        if (value.length() <= 4) {
            return "****";
        }
        return "****" + value.substring(value.length() - 4);
    }
}
