import api from "../api";
import {
  getAdminForeclosureRequests,
  reviewForeclosureRequest,
} from "./adminForeclosureService";

jest.mock("../api", () => ({
  get: jest.fn(),
  put: jest.fn(),
}));

describe("adminForeclosureService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fetches foreclosure requests with status", async () => {
    api.get.mockResolvedValue({ data: [{ id: "f1" }] });

    const data = await getAdminForeclosureRequests("PENDING");

    expect(api.get).toHaveBeenCalledWith("/admin/foreclosure-requests", {
      params: { status: "PENDING" },
    });
    expect(data).toEqual([{ id: "f1" }]);
  });

  it("reviews a foreclosure request", async () => {
    api.put.mockResolvedValue({ data: { id: "f1", status: "APPROVED" } });

    const data = await reviewForeclosureRequest("f1", true, "ok");

    expect(api.put).toHaveBeenCalledWith("/admin/foreclosure-requests/f1/review", {
      approve: true,
      comment: "ok",
    });
    expect(data).toEqual({ id: "f1", status: "APPROVED" });
  });
});
