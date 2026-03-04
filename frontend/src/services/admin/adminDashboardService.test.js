import api from "../api";
import { getDashboardStats, getProfitabilitySummary } from "./adminDashboardService";

jest.mock("../api", () => ({
  get: jest.fn(),
}));

describe("adminDashboardService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("getDashboardStats returns response data", async () => {
    api.get.mockResolvedValueOnce({ data: { total: 10 } });

    const result = await getDashboardStats();

    expect(api.get).toHaveBeenCalledWith("/admin/loan-applications/dashboard-stats");
    expect(result).toEqual({ total: 10 });
  });

  test("getProfitabilitySummary returns response data", async () => {
    api.get.mockResolvedValueOnce({ data: { totalInterestProfit: 2500 } });

    const result = await getProfitabilitySummary();

    expect(api.get).toHaveBeenCalledWith("/admin/payments/profitability");
    expect(result).toEqual({ totalInterestProfit: 2500 });
  });
});
