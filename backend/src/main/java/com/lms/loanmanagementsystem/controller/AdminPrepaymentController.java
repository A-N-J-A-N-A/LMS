package com.lms.loanmanagementsystem.controller;

import com.lms.loanmanagementsystem.dto.PrepaymentRequestResponse;
import com.lms.loanmanagementsystem.dto.PrepaymentReviewRequest;
import com.lms.loanmanagementsystem.model.PrepaymentRequestStatus;
import com.lms.loanmanagementsystem.service.PrepaymentRequestService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/admin/prepayment-requests")
@RequiredArgsConstructor
@CrossOrigin
public class AdminPrepaymentController {

    private final PrepaymentRequestService prepaymentRequestService;

    @GetMapping
    public List<PrepaymentRequestResponse> getRequests(
            @RequestParam(name = "status", required = false) PrepaymentRequestStatus status
    ) {
        return prepaymentRequestService.getAllRequests(status);
    }

    @PutMapping("/{id}/review")
    public PrepaymentRequestResponse reviewRequest(
            @PathVariable String id,
            @RequestBody PrepaymentReviewRequest request,
            Authentication authentication
    ) {
        return prepaymentRequestService.reviewRequest(id, authentication.getName(), request);
    }
}
