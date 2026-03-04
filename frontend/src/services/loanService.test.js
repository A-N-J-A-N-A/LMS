import api from "./api";
import { generateIdempotencyKey } from "../utils/idempotencyKey";
import {
  getAllLoans,
  getLoanById,
  applyLoan,
  getUserApplications,
  getUserLoans,
  getUserLoanDetails,
  trackApplicationById,
  getLoanApplicationDetails,
  createPrepaymentRequest,
  getMyPrepaymentRequests,
  payInstallment,
  getForeclosureQuote,
  payForeclosure,
  createForeclosureRequest,
  getMyForeclosureRequests,
} from "./loanService";

jest.mock("./api", () => ({
  get: jest.fn(),
  post: jest.fn(),
}));

jest.mock("../utils/idempotencyKey", () => ({
  generateIdempotencyKey: jest.fn(),
}));

describe("loanService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("getAllLoans calls /loans", () => {
    getAllLoans();
    expect(api.get).toHaveBeenCalledWith("/loans");
  });

  test("getLoanById calls /loans/:id", () => {
    getLoanById("loan-1");
    expect(api.get).toHaveBeenCalledWith("/loans/loan-1");
  });

  test("applyLoan adds idempotency header", () => {
    generateIdempotencyKey.mockReturnValue("idem-1");
    const payload = { amount: 1000 };

    applyLoan(payload);

    expect(api.post).toHaveBeenCalledWith("/loans/apply", payload, {
      headers: { "Idempotency-Key": "idem-1" },
    });
  });

  test("getUserApplications calls /user/applications", () => {
    getUserApplications();
    expect(api.get).toHaveBeenCalledWith("/user/applications");
  });

  test("getUserLoans calls /user/loans", () => {
    getUserLoans();
    expect(api.get).toHaveBeenCalledWith("/user/loans");
  });

  test("getUserLoanDetails calls /user/loans/:id", () => {
    getUserLoanDetails("loan-1");
    expect(api.get).toHaveBeenCalledWith("/user/loans/loan-1");
  });

  test("trackApplicationById calls /loans/application/:id", () => {
    trackApplicationById("app-1");
    expect(api.get).toHaveBeenCalledWith("/loans/application/app-1");
  });

  test("getLoanApplicationDetails calls /loans/application/:id", () => {
    getLoanApplicationDetails("app-2");
    expect(api.get).toHaveBeenCalledWith("/loans/application/app-2");
  });

  test("createPrepaymentRequest calls /user/prepayment-requests", () => {
    const payload = { amount: 1234 };
    createPrepaymentRequest(payload);
    expect(api.post).toHaveBeenCalledWith("/user/prepayment-requests", payload);
  });

  test("getMyPrepaymentRequests includes loanApplicationId params when provided", () => {
    getMyPrepaymentRequests("app-1");
    expect(api.get).toHaveBeenCalledWith("/user/prepayment-requests", {
      params: { loanApplicationId: "app-1" },
    });
  });

  test("getMyPrepaymentRequests sends empty params when loanApplicationId not provided", () => {
    getMyPrepaymentRequests();
    expect(api.get).toHaveBeenCalledWith("/user/prepayment-requests", {
      params: {},
    });
  });

  test("payInstallment adds idempotency header", () => {
    generateIdempotencyKey.mockReturnValue("idem-pay-1");
    const payload = { applicationId: "app-1", installmentNo: 1, amount: 1000, useWallet: true };

    payInstallment(payload);

    expect(api.post).toHaveBeenCalledWith("/payments", payload, {
      headers: { "Idempotency-Key": "idem-pay-1" },
    });
  });

  test("getForeclosureQuote calls foreclosure quote endpoint", () => {
    getForeclosureQuote("app-9");
    expect(api.get).toHaveBeenCalledWith("/payments/foreclosure/quote", {
      params: { applicationId: "app-9" },
    });
  });

  test("payForeclosure adds idempotency header", () => {
    generateIdempotencyKey.mockReturnValue("idem-foreclose-1");
    const payload = { applicationId: "app-9", amount: 10000, useWallet: false };

    payForeclosure(payload);

    expect(api.post).toHaveBeenCalledWith("/payments/foreclosure/pay", payload, {
      headers: { "Idempotency-Key": "idem-foreclose-1" },
    });
  });

  test("createForeclosureRequest calls /user/foreclosure-requests", () => {
    const payload = { loanApplicationId: "app-9", requestedAmount: 1000 };
    createForeclosureRequest(payload);
    expect(api.post).toHaveBeenCalledWith("/user/foreclosure-requests", payload);
  });

  test("getMyForeclosureRequests includes loanApplicationId params when provided", () => {
    getMyForeclosureRequests("app-9");
    expect(api.get).toHaveBeenCalledWith("/user/foreclosure-requests", {
      params: { loanApplicationId: "app-9" },
    });
  });
});
