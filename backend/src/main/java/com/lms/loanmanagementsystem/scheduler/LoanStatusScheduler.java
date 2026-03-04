package com.lms.loanmanagementsystem.scheduler;

import com.lms.loanmanagementsystem.model.JobRunLog;
import com.lms.loanmanagementsystem.model.LoanApplication;
import com.lms.loanmanagementsystem.model.LoanStatus;
import com.lms.loanmanagementsystem.repository.LoanApplicationRepository;
import com.lms.loanmanagementsystem.service.JobRunLogService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class LoanStatusScheduler {

    private final LoanApplicationRepository loanApplicationRepository;
    private final JobRunLogService jobRunLogService;

    @Scheduled(fixedRate = 600000)
    public void checkPendingLoans() {

        String runId = UUID.randomUUID().toString();
        String jobName = "LoanStatusScheduler.checkPendingLoans";
        int attempt = 1;

        LocalDateTime start = LocalDateTime.now();

        // START
        log.info("JOB_START job={} runId={} attempt={} startedAt={}", jobName, runId, attempt, start);

        jobRunLogService.save(JobRunLog.builder()
                .jobName(jobName)
                .runId(runId)
                .status("START")
                .attempt(attempt)
                .startedAt(start)
                .build());

        try {
            List<LoanApplication> pendingLoans =
                    loanApplicationRepository.findByStatus(LoanStatus.APPLIED);

            long durationMs = Duration.between(start, LocalDateTime.now()).toMillis();

            var metadata = new HashMap<String, Object>();
            metadata.put("statusChecked", LoanStatus.APPLIED.name());
            metadata.put("pendingCount", pendingLoans.size());

            // SUCCESS (console + Mongo)
            log.info("JOB_SUCCESS job={} runId={} attempt={} durationMs={} statusChecked={} pendingCount={}",
                    jobName, runId, attempt, durationMs, LoanStatus.APPLIED.name(), pendingLoans.size());

            jobRunLogService.save(JobRunLog.builder()
                    .jobName(jobName)
                    .runId(runId)
                    .status("SUCCESS")
                    .attempt(attempt)
                    .startedAt(start)
                    .endedAt(LocalDateTime.now())
                    .durationMs(durationMs)
                    .metadata(metadata)
                    .build());

        } catch (Exception e) {
            long durationMs = Duration.between(start, LocalDateTime.now()).toMillis();

            // FAILURE (console + Mongo)
            log.error("JOB_FAILURE job={} runId={} attempt={} durationMs={} errorType={} message={}",
                    jobName, runId, attempt, durationMs, e.getClass().getSimpleName(), e.getMessage(), e);

            jobRunLogService.save(JobRunLog.builder()
                    .jobName(jobName)
                    .runId(runId)
                    .status("FAILURE")
                    .attempt(attempt)
                    .startedAt(start)
                    .endedAt(LocalDateTime.now())
                    .durationMs(durationMs)
                    .errorMessage(e.getMessage())
                    .build());
        }
    }
}
