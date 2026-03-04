package com.lms.loanmanagementsystem.controller;

import com.lms.loanmanagementsystem.dto.ForeclosureRequestCreateRequest;
import com.lms.loanmanagementsystem.dto.ForeclosureRequestResponse;
import com.lms.loanmanagementsystem.service.ForeclosureRequestService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/user/foreclosure-requests")
@RequiredArgsConstructor
@CrossOrigin
public class UserForeclosureController {

    private final ForeclosureRequestService foreclosureRequestService;

    @PostMapping
    public ForeclosureRequestResponse create(
            @RequestBody ForeclosureRequestCreateRequest request,
            Authentication authentication
    ) {
        return foreclosureRequestService.createRequest(authentication.getName(), request);
    }

    @GetMapping
    public List<ForeclosureRequestResponse> getMyRequests(
            @RequestParam(required = false) String loanApplicationId,
            Authentication authentication
    ) {
        return foreclosureRequestService.getUserRequests(authentication.getName(), loanApplicationId);
    }
}
