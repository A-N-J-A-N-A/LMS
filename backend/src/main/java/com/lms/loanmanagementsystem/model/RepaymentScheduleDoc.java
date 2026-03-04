package com.lms.loanmanagementsystem.model;

import com.lms.loanmanagementsystem.dto.RepaymentScheduleItem;
import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;

@Document(collection = "repayment_schedules")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RepaymentScheduleDoc {

    @Id
    private String id;

    private String loanApplicationId;

    private Integer version;          // 1,2,3...
    private String status;            // ACTIVE / CLOSED

    private LocalDateTime createdAt;
    private String createdBy;         // adminId
    private String reason;            // DISBURSEMENT / PREPAYMENT

    private LocalDateTime effectiveFrom;

    private List<RepaymentScheduleItem> items;
}
