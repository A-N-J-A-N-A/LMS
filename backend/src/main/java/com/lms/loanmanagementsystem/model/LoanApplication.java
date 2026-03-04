package com.lms.loanmanagementsystem.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.lms.loanmanagementsystem.dto.RepaymentScheduleItem;
import lombok.*;
import org.bson.types.ObjectId;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Document(collection = "loan_applications")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoanApplication {

    @Id
    private String id;

    private String userId;
    private String loanTypeId;

    private BigDecimal amount;
    private Integer tenure;

    private LoanStatus status;
    private KycStatus kycStatus;

    @JsonIgnore
    private Map<String, Object> applicationData;

    private BigDecimal disbursedAmount;
    private LocalDateTime disbursedAt;
    private String disbursedBy;

    @JsonIgnore
    private LocalDateTime createdAt;

    private String reviewedBy;
    private String reviewComment;
    private LocalDateTime reviewedAt;

    private List<RepaymentScheduleItem> repaymentSchedule;

    private String activeScheduleId;
    private Integer activeScheduleVersion;

    private LocalDateTime closedAt;
    private String closedBy;

}