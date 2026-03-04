import api from "../api";
import {
  getAllCustomers,
  getPendingKycApplications,
  getUserKycDetails,
  reviewUserKyc,
} from "./adminUserService";

jest.mock("../api", () => ({
  get: jest.fn(),
  put: jest.fn(),
}));

describe("adminUserService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("getAllCustomers returns data", async () => {
    api.get.mockResolvedValueOnce({ data: [{ id: "u1" }] });
    const result = await getAllCustomers();
    expect(api.get).toHaveBeenCalledWith("/admin/users/customers");
    expect(result).toEqual([{ id: "u1" }]);
  });

  test("getPendingKycApplications returns data", async () => {
    api.get.mockResolvedValueOnce({ data: [{ userId: "u1" }] });
    const result = await getPendingKycApplications();
    expect(api.get).toHaveBeenCalledWith("/admin/users/kyc/pending");
    expect(result).toEqual([{ userId: "u1" }]);
  });

  test("getUserKycDetails returns data", async () => {
    api.get.mockResolvedValueOnce({ data: { userId: "u1" } });
    const result = await getUserKycDetails("u1");
    expect(api.get).toHaveBeenCalledWith("/admin/users/kyc/u1");
    expect(result).toEqual({ userId: "u1" });
  });

  test("reviewUserKyc sends approve/comment payload", async () => {
    api.put.mockResolvedValueOnce({ data: { ok: true } });
    const result = await reviewUserKyc("u1", true, "looks good");
    expect(api.put).toHaveBeenCalledWith("/admin/users/kyc-review/u1", {
      approve: true,
      comment: "looks good",
    });
    expect(result).toEqual({ ok: true });
  });
});
