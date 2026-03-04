package com.lms.loanmanagementsystem.controller;

import com.lms.loanmanagementsystem.dto.ForeclosureRequestResponse;
import com.lms.loanmanagementsystem.dto.PrepaymentReviewRequest;
import com.lms.loanmanagementsystem.model.ForeclosureRequestStatus;
import com.lms.loanmanagementsystem.service.ForeclosureRequestService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/admin/foreclosure-requests")
@RequiredArgsConstructor
@CrossOrigin
public class AdminForeclosureController {

    private final ForeclosureRequestService foreclosureRequestService;

    @GetMapping
    public List<ForeclosureRequestResponse> getRequests(
            @RequestParam(name = "status", required = false) ForeclosureRequestStatus status
    ) {
        return foreclosureRequestService.getAllRequests(status);
    }

    @PutMapping("/{id}/review")
    public ForeclosureRequestResponse reviewRequest(
            @PathVariable String id,
            @RequestBody PrepaymentReviewRequest request,
            Authentication authentication
    ) {
        return foreclosureRequestService.reviewRequest(id, authentication.getName(), request);
    }
}
