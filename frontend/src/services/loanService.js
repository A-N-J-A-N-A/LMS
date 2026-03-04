import api from "./api";
import { generateIdempotencyKey } from "../utils/idempotencyKey";
// Public
export const getAllLoans = () => api.get("/loans");
export const getLoanById = (loanId) => api.get(`/loans/${loanId}`);

// Protected
export const applyLoan = (data) => {
    const idempotencyKey = generateIdempotencyKey();

    return api.post("/loans/apply", data, {
        headers: {
            "Idempotency-Key": idempotencyKey,
        },
    });
};
export const getUserApplications = () => api.get("/user/applications");
export const getUserLoans = () => api.get("/user/loans");
export const getUserLoanDetails = (loanId) => api.get(`/user/loans/${loanId}`);
  
export const trackApplicationById = (applicationId) =>
  api.get(`/loans/application/${applicationId}`);

export const getLoanApplicationDetails = (applicationId) =>
    api.get(`/loans/application/${applicationId}`);

export const createPrepaymentRequest = (data) =>
    api.post("/user/prepayment-requests", data);

export const getMyPrepaymentRequests = (loanApplicationId) =>
    api.get("/user/prepayment-requests", {
      params: loanApplicationId ? { loanApplicationId } : {},
    });

export const payInstallment = (data) => {
    const idempotencyKey = generateIdempotencyKey();

    return api.post("/payments", data, {
        headers: {
            "Idempotency-Key": idempotencyKey,
        },
    });
};

export const getForeclosureQuote = (applicationId) =>
    api.get("/payments/foreclosure/quote", {
      params: { applicationId },
    });

export const payForeclosure = (data) => {
    const idempotencyKey = generateIdempotencyKey();

    return api.post("/payments/foreclosure/pay", data, {
        headers: {
            "Idempotency-Key": idempotencyKey,
        },
    });
};

export const createForeclosureRequest = (data) =>
    api.post("/user/foreclosure-requests", data);

export const getMyForeclosureRequests = (loanApplicationId) =>
    api.get("/user/foreclosure-requests", {
      params: loanApplicationId ? { loanApplicationId } : {},
    });
