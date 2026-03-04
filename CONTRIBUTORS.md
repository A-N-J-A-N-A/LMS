# Loan Management System - Contributors and Feature Ownership

This document captures contribution ownership using a single format for all 4 members.

## Team Members
- Anjana K
- Prasanth R
- Sankaran S
- Kavyashree G

## Member-Wise Contributions

### Anjana K
- Contribution areas:
  - Repayment and financial processing
  - Admin analytics and profitability
  - Wallet logic and foreclosure flow
  - Testing/QA and bug fixing
  - Database design support
- Key modules/files:
  - `backend/src/main/java/com/lms/loanmanagementsystem/controller/LoanController.java`
  - `backend/src/main/java/com/lms/loanmanagementsystem/service/LoanService.java`
  - `backend/src/main/java/com/lms/loanmanagementsystem/scheduler/LoanStatusScheduler.java`
  - `backend/src/main/java/com/lms/loanmanagementsystem/model/LoanApplication.java`
  - `backend/src/main/java/com/lms/loanmanagementsystem/service/PaymentService.java`
  - `backend/src/main/java/com/lms/loanmanagementsystem/repository/RepaymentScheduleRepository.java`
  - `backend/src/main/java/com/lms/loanmanagementsystem/model/RepaymentScheduleDoc.java`
  - `backend/src/main/java/com/lms/loanmanagementsystem/model/TransactionLedger.java`
  - `backend/src/main/java/com/lms/loanmanagementsystem/service/PaymentSummaryService.java`
  - `backend/src/main/java/com/lms/loanmanagementsystem/service/PaymentQueryService.java`
  - `frontend/src/pages/admin/AdminAnalytics.jsx`
  - `frontend/src/pages/admin/AdminProfitability.jsx`
  - `frontend/src/services/admin/adminAnalyticsService.js`
  - `frontend/src/services/admin/adminDashboardService.js`
  - `backend/src/main/java/com/lms/loanmanagementsystem/controller/PaymentController.java`
  - `frontend/src/pages/payment/PaymentPage.jsx`

### Prasanth R
- Contribution areas:
  - JWT security
  - Payment flow (including Stripe)
  - Idempotency
  - KYC
- Key modules/files:
  - `backend/src/main/java/com/lms/loanmanagementsystem/config/SecurityConfig.java`
  - `backend/src/main/java/com/lms/loanmanagementsystem/config/JwtAuthenticationFilter.java`
  - `backend/src/main/java/com/lms/loanmanagementsystem/config/JwtUtil.java`
  - `backend/src/main/java/com/lms/loanmanagementsystem/controller/PaymentController.java`
  - `backend/src/main/java/com/lms/loanmanagementsystem/service/PaymentService.java`
  - `backend/src/main/java/com/lms/loanmanagementsystem/service/StripePaymentService.java`
  - `frontend/src/utils/idempotencyKey.js`
  - `backend/src/main/java/com/lms/loanmanagementsystem/controller/UserController.java`
  - `frontend/src/pages/user/UpdateKyc.jsx`

### Sankaran S
- Contribution areas:
  - Audit logs
  - Testing
  - Calculators
- Key modules/files:
  - `frontend/src/pages/user/CalculatorHome.jsx`
  - `frontend/src/Components/Calculator/EMICalculator.jsx`
  - `frontend/src/Components/Calculator/CibilCalculator.jsx`
  - `frontend/src/Components/Calculator/EligibilityCalculator.jsx`
  - `backend/src/main/java/com/lms/loanmanagementsystem/config/AuditLoggingFilter.java`
  - `backend/src/main/java/com/lms/loanmanagementsystem/controller/AuditLogController.java`
  - `backend/src/main/java/com/lms/loanmanagementsystem/service/AuditLogService.java`
  - `backend/src/main/java/com/lms/loanmanagementsystem/repository/AuditLogRepository.java`
  - `backend/src/main/java/com/lms/loanmanagementsystem/model/AuditLog.java`
  - `frontend/src/hooks/useAdminAuditLogs.js`
  - `backend/src/test/java/com/lms/loanmanagementsystem/controller/AuditLogControllerTest.java`
  - `backend/src/test/java/com/lms/loanmanagementsystem/config/AuditPayloadMaskerTest.java`
  - `frontend/src/services/admin/adminAuditService.test.js`

### Kavyashree G
- Contribution areas:
  - Login and Register
  - Disbursement
  - Active loans
  - User profile page
  - Track application
  - Job scheduling
  - Key modules/files:
  - `frontend/src/pages/user/Login.jsx`
  - `frontend/src/pages/user/Register.jsx`
  - `frontend/src/pages/admin/AdminLoanDisbursement.jsx`
  - `frontend/src/pages/admin/AdminActiveLoans.jsx`
  - `frontend/src/pages/user/UserProfile.jsx`
  - `frontend/src/pages/user/TrackStatus.jsx`
  - `backend/src/main/java/com/lms/loanmanagementsystem/scheduler/LoanStatusScheduler.java`
