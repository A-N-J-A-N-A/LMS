import api from "../api";
import { getAdminAnalyticsSummary } from "./adminAnalyticsService";

jest.mock("../api", () => ({
  get: jest.fn(),
}));

describe("adminAnalyticsService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("getAdminAnalyticsSummary returns response data", async () => {
    api.get.mockResolvedValueOnce({ data: { totalSessions: 10 } });

    const result = await getAdminAnalyticsSummary(30);

    expect(api.get).toHaveBeenCalledWith("/admin/analytics/summary", {
      params: { days: 30 },
    });
    expect(result).toEqual({ totalSessions: 10 });
  });
});
