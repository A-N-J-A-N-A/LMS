package com.lms.loanmanagementsystem.model;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.Map;

@Document(collection = "job_run_logs")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JobRunLog {

    @Id
    private String id;

    private String jobName;     // LoanStatusScheduler.checkPendingLoans
    private String runId;       // UUID per run
    private String status;      // START / SUCCESS / FAILURE / RETRY

    private Integer attempt;    // 1,2,3...
    private LocalDateTime startedAt;
    private LocalDateTime endedAt;
    private Long durationMs;

    private Map<String, Object> metadata; // pendingCount, etc.

    private String errorMessage;
}
