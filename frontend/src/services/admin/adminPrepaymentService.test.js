import api from "../api";
import {
  getAdminPrepaymentRequests,
  reviewPrepaymentRequest,
} from "./adminPrepaymentService";

jest.mock("../api", () => ({
  get: jest.fn(),
  put: jest.fn(),
}));

describe("adminPrepaymentService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("getAdminPrepaymentRequests includes status when provided", async () => {
    api.get.mockResolvedValueOnce({ data: [{ id: "p1" }] });
    const result = await getAdminPrepaymentRequests("PENDING");
    expect(api.get).toHaveBeenCalledWith("/admin/prepayment-requests", {
      params: { status: "PENDING" },
    });
    expect(result).toEqual([{ id: "p1" }]);
  });

  test("getAdminPrepaymentRequests sends empty params when status missing", async () => {
    api.get.mockResolvedValueOnce({ data: [] });
    const result = await getAdminPrepaymentRequests();
    expect(api.get).toHaveBeenCalledWith("/admin/prepayment-requests", {
      params: {},
    });
    expect(result).toEqual([]);
  });

  test("reviewPrepaymentRequest sends approve/comment payload", async () => {
    api.put.mockResolvedValueOnce({ data: { ok: true } });
    const result = await reviewPrepaymentRequest("p1", true, "approved");
    expect(api.put).toHaveBeenCalledWith("/admin/prepayment-requests/p1/review", {
      approve: true,
      comment: "approved",
    });
    expect(result).toEqual({ ok: true });
  });
});
