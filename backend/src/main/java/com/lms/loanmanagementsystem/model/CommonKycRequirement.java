package com.lms.loanmanagementsystem.model;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;
import java.util.Map;

@Document(collection = "common_kyc_requirements")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CommonKycRequirement {

    @Id
    private String id;

    @Builder.Default
    private List<String> identityProof = new java.util.ArrayList<>();

    @Builder.Default
    private List<String> addressProof = new java.util.ArrayList<>();

    @Builder.Default
    private List<String> personalDetails = new java.util.ArrayList<>();

    @Builder.Default
    private Map<String, List<String>> incomeAndEmploymentProof = new java.util.HashMap<>();

    @Builder.Default
    private List<String> creditConsent = new java.util.ArrayList<>();
}
