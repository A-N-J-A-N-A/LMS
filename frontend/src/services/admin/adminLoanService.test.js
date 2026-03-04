import api from "../api";
import {
  getAllApplications,
  getApplicationById,
  getActiveLoans,
  getLoanRepaymentTracker,
  approveApplication,
  rejectApplication,
  disburseLoan,
  fetchApplicationDocument,
} from "./adminLoanService";

jest.mock("../api", () => ({
  get: jest.fn(),
  put: jest.fn(),
  post: jest.fn(),
}));

describe("adminLoanService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("getAllApplications sends optional status filter and returns data", async () => {
    api.get.mockResolvedValueOnce({ data: [{ applicationId: "a1" }] });
    const result = await getAllApplications("APPLIED");
    expect(api.get).toHaveBeenCalledWith("/admin/loan-applications", {
      params: { status: "APPLIED" },
    });
    expect(result).toEqual([{ applicationId: "a1" }]);
  });

  test("getApplicationById returns data", async () => {
    api.get.mockResolvedValueOnce({ data: { applicationId: "a1" } });
    const result = await getApplicationById("a1");
    expect(api.get).toHaveBeenCalledWith("/admin/loan-applications/a1");
    expect(result).toEqual({ applicationId: "a1" });
  });

  test("getActiveLoans returns primary endpoint data when available", async () => {
    api.get.mockResolvedValueOnce({ data: [{ applicationId: "a1" }] });

    const result = await getActiveLoans();

    expect(api.get).toHaveBeenCalledWith("/admin/loan-applications/active-loans");
    expect(result).toEqual([{ applicationId: "a1" }]);
  });

  test("getActiveLoans falls back when active-loans endpoint returns 404", async () => {
    api.get.mockImplementation((url, config) => {
      if (url === "/admin/loan-applications/active-loans") {
        return Promise.reject({ response: { status: 404 } });
      }
      if (url === "/admin/loan-applications" && config?.params?.status === "DISBURSED") {
        return Promise.resolve({
          data: [
            {
              applicationId: "a1",
              userId: "u1",
              customerName: "User One",
              loanTypeId: "HOME_LOAN",
              status: "DISBURSED",
              amount: 500000,
              tenure: 24,
            },
          ],
        });
      }
      if (url === "/admin/loan-applications" && config?.params?.status === "ACTIVE") {
        return Promise.resolve({ data: [] });
      }
      if (url === "/admin/loan-applications/a1/repayment-tracker") {
        return Promise.resolve({
          data: {
            applicationId: "a1",
            userId: "u1",
            customerName: "User One",
            loanTypeId: "HOME_LOAN",
            status: "ACTIVE",
            sanctionedAmount: 500000,
            disbursedAmount: 500000,
            tenure: 24,
            disbursedAt: "2025-01-01",
            totalInstallments: 24,
            paidInstallments: 3,
            totalPaidAmount: 75000,
            outstandingAmount: 425000,
            repaymentSchedule: [{ status: "upcoming", dueDate: "2026-01-01" }],
          },
        });
      }
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    });

    const result = await getActiveLoans();

    expect(result).toEqual([
      expect.objectContaining({
        applicationId: "a1",
        nextDueDate: "2026-01-01",
      }),
    ]);
  });

  test("getActiveLoans rethrows non-404 errors from primary endpoint", async () => {
    const err = { response: { status: 500 } };
    api.get.mockRejectedValueOnce(err);
    await expect(getActiveLoans()).rejects.toBe(err);
  });

  test("getLoanRepaymentTracker returns tracker data", async () => {
    api.get.mockResolvedValueOnce({ data: { applicationId: "a1" } });
    const result = await getLoanRepaymentTracker("a1");
    expect(api.get).toHaveBeenCalledWith("/admin/loan-applications/a1/repayment-tracker");
    expect(result).toEqual({ applicationId: "a1" });
  });

  test("approveApplication sends comment and returns data", async () => {
    api.put.mockResolvedValueOnce({ data: { ok: true } });
    const result = await approveApplication("a1", "approved");
    expect(api.put).toHaveBeenCalledWith("/admin/loan-applications/approve/a1", {
      comment: "approved",
    });
    expect(result).toEqual({ ok: true });
  });

  test("rejectApplication sends comment and returns data", async () => {
    api.put.mockResolvedValueOnce({ data: { ok: true } });
    const result = await rejectApplication("a1", "rejected");
    expect(api.put).toHaveBeenCalledWith("/admin/loan-applications/reject/a1", {
      comment: "rejected",
    });
    expect(result).toEqual({ ok: true });
  });

  test("disburseLoan sends amount and returns data", async () => {
    api.post.mockResolvedValueOnce({ data: { ok: true } });
    const result = await disburseLoan("a1", 20000);
    expect(api.post).toHaveBeenCalledWith("/admin/loan-applications/disburse/a1", {
      amount: 20000,
    });
    expect(result).toEqual({ ok: true });
  });

  test("fetchApplicationDocument maps blob and headers", async () => {
    const blob = new Blob(["abc"], { type: "application/pdf" });
    api.get.mockResolvedValueOnce({
      data: blob,
      headers: {
        "content-type": "application/pdf",
        "content-disposition": 'attachment; filename="doc.pdf"',
      },
    });

    const result = await fetchApplicationDocument("a1", "salarySlip1", true);

    expect(api.get).toHaveBeenCalledWith("/admin/loan-applications/a1/documents/salarySlip1", {
      params: { download: true },
      responseType: "blob",
    });
    expect(result).toEqual({
      blob,
      contentType: "application/pdf",
      contentDisposition: 'attachment; filename="doc.pdf"',
    });
  });
});
