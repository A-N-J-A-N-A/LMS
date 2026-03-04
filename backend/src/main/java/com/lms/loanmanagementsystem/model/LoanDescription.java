package com.lms.loanmanagementsystem.model;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;
import java.util.Map;

@Document(collection = "loan_descriptions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LoanDescription {

    @Id
    private String id;

    private String loanTypeId;

    private String shortDescription;
    private String longDescription;

    @Builder.Default
    private Map<String, String> eligibility = new java.util.HashMap<>();

    @Builder.Default
    private List<String> employmentTypes = new java.util.ArrayList<>();

    @Builder.Default
    private Map<String, List<String>> documentsRequired = new java.util.HashMap<>();

    @Builder.Default
    private List<String> benefits = new java.util.ArrayList<>();

    @Builder.Default
    private Map<String, String> charges = new java.util.HashMap<>();

    private Long minAmount;       // minimum loan amount
    private Long maxAmount;       // maximum loan amount
    private Integer minTenure;    // minimum tenure in months
    private Integer maxTenure;
}
