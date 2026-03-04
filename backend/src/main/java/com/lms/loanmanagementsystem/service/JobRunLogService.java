package com.lms.loanmanagementsystem.service;

import com.lms.loanmanagementsystem.model.JobRunLog;
import com.lms.loanmanagementsystem.repository.JobRunLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class JobRunLogService {
    private final JobRunLogRepository repo;

    public JobRunLog save(JobRunLog log) {
        return repo.save(log);
    }
}
