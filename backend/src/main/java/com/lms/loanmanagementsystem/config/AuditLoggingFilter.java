package com.lms.loanmanagementsystem.config;

import com.lms.loanmanagementsystem.model.AuditLog;
import com.lms.loanmanagementsystem.service.AuditLogService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.util.ContentCachingRequestWrapper;
import org.springframework.web.util.ContentCachingResponseWrapper;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
@RequiredArgsConstructor
public class AuditLoggingFilter extends OncePerRequestFilter {

    private final AuditLogService auditLogService;
    private final AuditPayloadMasker auditPayloadMasker;

    @Value("${app.audit.max-snapshot-length:8000}")
    private int maxSnapshotLength;

    @Value("${app.audit.include-auth-endpoints:true}")
    private boolean includeAuthEndpoints;

    private static final String CORRELATION_HEADER = "X-Correlation-Id";
    private static final Pattern USER_ID_PATTERN = Pattern.compile(
            "(?i)\"(?:usernameOrEmail|email|mobile|userId)\"\\s*:\\s*\"([^\"]+)\""
    );

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        ContentCachingRequestWrapper wrappedRequest = request instanceof ContentCachingRequestWrapper
                ? (ContentCachingRequestWrapper) request
                : new ContentCachingRequestWrapper(request, Math.max(maxSnapshotLength, 1024));
        ContentCachingResponseWrapper wrappedResponse = new ContentCachingResponseWrapper(response);
        String correlationId = resolveCorrelationId(wrappedRequest);
        wrappedResponse.setHeader(CORRELATION_HEADER, correlationId);
        long startedAtMs = System.currentTimeMillis();

        try {
            filterChain.doFilter(wrappedRequest, wrappedResponse);
        } finally {
            writeAuditRecord(wrappedRequest, wrappedResponse, correlationId, startedAtMs);
            wrappedResponse.copyBodyToResponse();
        }
    }

    private void writeAuditRecord(
            ContentCachingRequestWrapper request,
            ContentCachingResponseWrapper response,
            String correlationId,
            long startedAtMs
    ) {
        if (!includeAuthEndpoints && request.getServletPath().startsWith("/auth")) {
            return;
        }

        Authentication auth =
                SecurityContextHolder.getContext().getAuthentication();

        boolean authenticated = auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getName());

        String requestBody = getRequestBody(request);
        String responseBody = getResponseBody(response);
        String apiPath = request.getServletPath();
        String action = resolveAction(request.getMethod(), apiPath);
        String resourceType = resolveResourceType(apiPath);
        boolean success = response.getStatus() < 400;
        String resolvedUserId = resolveUserId(authenticated, auth, apiPath, requestBody);
        String maskedRequest = auditPayloadMasker.maskAndTruncate(requestBody, request.getContentType(), maxSnapshotLength);
        String maskedResponse = resolveResponsePayload(action, success, responseBody, response.getContentType());

        AuditLog log = AuditLog.builder()
                .correlationId(correlationId)
                .userId(resolvedUserId)
                .action(action)
                .resourceType(resourceType)
                .requestPayloadMasked(maskedRequest)
                .responsePayloadMasked(maskedResponse)
                .success(success)
                .httpStatus(response.getStatus())
                .httpMethod(request.getMethod())
                .apiPath(apiPath)
                .ipAddress(request.getRemoteAddr())
                .durationMs(Math.max(0L, System.currentTimeMillis() - startedAtMs))
                .build();

        auditLogService.log(log);
    }

    private String resolveAction(String method, String path) {
        if ("/auth/register".equals(path)) {
            return "USER_REGISTER";
        }
        if ("/auth/login".equals(path) || "/auth/login/user".equals(path)) {
            return "USER_LOGIN";
        }
        if ("/auth/login/admin".equals(path)) {
            return "ADMIN_LOGIN";
        }
        return (method + "_" + path.replace('/', '_')).toUpperCase(Locale.ROOT);
    }

    private String resolveResourceType(String path) {
        if (path.startsWith("/auth")) return "AUTH";
        if (path.startsWith("/admin")) return "ADMIN";
        if (path.startsWith("/loans")) return "LOAN";
        if (path.startsWith("/payments")) return "PAYMENT";
        if (path.startsWith("/user")) return "USER";
        return "UNKNOWN";
    }

    private String resolveCorrelationId(HttpServletRequest request) {
        String existing = request.getHeader(CORRELATION_HEADER);
        return StringUtils.hasText(existing) ? existing.trim() : UUID.randomUUID().toString();
    }

    private String getRequestBody(ContentCachingRequestWrapper request) {
        byte[] body = request.getContentAsByteArray();
        if (body == null || body.length == 0) {
            return null;
        }
        return new String(body, resolveCharset(request.getCharacterEncoding()));
    }

    private String getResponseBody(ContentCachingResponseWrapper response) {
        byte[] body = response.getContentAsByteArray();
        if (body == null || body.length == 0) {
            return null;
        }
        return new String(body, resolveCharset(response.getCharacterEncoding()));
    }

    private Charset resolveCharset(String encoding) {
        if (!StringUtils.hasText(encoding)) {
            return StandardCharsets.UTF_8;
        }
        try {
            return Charset.forName(encoding);
        } catch (Exception ex) {
            return StandardCharsets.UTF_8;
        }
    }

    private String resolveUserId(boolean authenticated, Authentication auth, String path, String requestBody) {
        if (authenticated && auth != null && StringUtils.hasText(auth.getName())) {
            return auth.getName();
        }
        if (path.startsWith("/auth")) {
            String fromPayload = extractUserIdentifier(requestBody);
            if (StringUtils.hasText(fromPayload)) {
                return fromPayload;
            }
        }
        return "ANONYMOUS";
    }

    private String extractUserIdentifier(String payload) {
        if (!StringUtils.hasText(payload)) {
            return null;
        }
        Matcher matcher = USER_ID_PATTERN.matcher(payload);
        if (matcher.find()) {
            return matcher.group(1).trim();
        }
        return null;
    }

    private String resolveResponsePayload(String action, boolean success, String responseBody, String responseContentType) {
        if (!success && "USER_LOGIN".equals(action)) {
            return "LOGIN_FAILED";
        }
        if (!success && "ADMIN_LOGIN".equals(action)) {
            return "ADMIN_LOGIN_FAILED";
        }
        if (!success && "USER_REGISTER".equals(action)) {
            return "REGISTER_FAILED";
        }
        return auditPayloadMasker.maskAndTruncate(responseBody, responseContentType, maxSnapshotLength);
    }
}
