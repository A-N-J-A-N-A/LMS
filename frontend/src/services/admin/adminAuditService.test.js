import api from "../api";
import { getAllAuditLogs } from "./adminAuditService";

jest.mock("../api", () => ({
  get: jest.fn(),
}));

describe("adminAuditService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("getAllAuditLogs returns audit logs data", async () => {
    api.get.mockResolvedValueOnce({ data: [{ id: "log-1" }] });

    const result = await getAllAuditLogs();

    expect(api.get).toHaveBeenCalledWith("/audit/all");
    expect(result).toEqual([{ id: "log-1" }]);
  });
});
