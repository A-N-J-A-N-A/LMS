package com.lms.loanmanagementsystem.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import java.nio.charset.StandardCharsets;

@Configuration
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final AuditLoggingFilter auditLoggingFilter;
    public SecurityConfig(
            JwtAuthenticationFilter jwtAuthenticationFilter,
            AuditLoggingFilter auditLoggingFilter
    ) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.auditLoggingFilter = auditLoggingFilter;
    }


    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {

        http
                .csrf(csrf -> csrf.disable())
                .cors(Customizer.withDefaults())
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint((request, response, authException) -> {
                            response.setStatus(401);
                            response.setCharacterEncoding(StandardCharsets.UTF_8.name());
                            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                            response.getWriter().write("{\"status\":401,\"message\":\"Unauthorized: missing or invalid token\"}");
                        })
                        .accessDeniedHandler((request, response, accessDeniedException) -> {
                            response.setStatus(403);
                            response.setCharacterEncoding(StandardCharsets.UTF_8.name());
                            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                            response.getWriter().write("{\"status\":403,\"message\":\"Forbidden: insufficient permission\"}");
                        })
                )
                .authorizeHttpRequests(auth -> auth
                        // Public
                        .requestMatchers("/auth/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/loans/**").permitAll()
                        .requestMatchers("/calculator/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/analytics/events").permitAll()

                        // Payments
                        .requestMatchers(HttpMethod.GET, "/admin/payments/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.POST, "/payments/**").hasRole("USER")
                        .requestMatchers(HttpMethod.GET, "/payments/**").hasAnyRole("USER", "ADMIN")

                        // Admin (must be before catch-all)
                        .requestMatchers("/admin/**").hasRole("ADMIN")

                        // User loan apply
                        .requestMatchers(HttpMethod.POST, "/loans/apply").hasRole("USER")

                        // Catch-all
                        .anyRequest().authenticated()
                )
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterAfter(auditLoggingFilter, JwtAuthenticationFilter.class);

        return http.build();
    }


}
