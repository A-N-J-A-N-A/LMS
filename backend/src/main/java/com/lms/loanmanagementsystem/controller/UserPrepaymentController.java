package com.lms.loanmanagementsystem.controller;

import com.lms.loanmanagementsystem.dto.PrepaymentRequestCreateRequest;
import com.lms.loanmanagementsystem.dto.PrepaymentRequestResponse;
import com.lms.loanmanagementsystem.service.PrepaymentRequestService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/user/prepayment-requests")
@RequiredArgsConstructor
@CrossOrigin
public class UserPrepaymentController {

    private final PrepaymentRequestService prepaymentRequestService;

    @PostMapping
    public PrepaymentRequestResponse create(
            @RequestBody PrepaymentRequestCreateRequest request,
            Authentication authentication
    ) {
        return prepaymentRequestService.createRequest(authentication.getName(), request);
    }

    @GetMapping
    public List<PrepaymentRequestResponse> getMyRequests(
            @RequestParam(required = false) String loanApplicationId,
            Authentication authentication
    ) {
        return prepaymentRequestService.getUserRequests(authentication.getName(), loanApplicationId);
    }
}
