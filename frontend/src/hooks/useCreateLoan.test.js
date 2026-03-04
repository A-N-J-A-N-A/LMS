import { act, renderHook } from "@testing-library/react";
import useCreateLoan from "./useCreateLoan";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { generateIdempotencyKey } from "../utils/idempotencyKey";

jest.mock("../services/api", () => ({
  post: jest.fn(),
}));

jest.mock("../context/AuthContext", () => ({
  useAuth: jest.fn(),
}));

jest.mock("../utils/idempotencyKey", () => ({
  generateIdempotencyKey: jest.fn(),
}));

describe("useCreateLoan", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({ token: "token-1" });
    generateIdempotencyKey.mockReturnValue("idem-1");
  });

  test("submits loan with idempotency and auth headers", async () => {
    api.post.mockResolvedValue({
      data: { applicationId: "APP-1", message: "Created" },
    });

    const { result } = renderHook(() => useCreateLoan());
    let response;
    await act(async () => {
      response = await result.current.createLoan({ amount: 1000 });
    });

    expect(api.post).toHaveBeenCalledWith(
      "/loans/apply",
      { amount: 1000 },
      {
        headers: {
          "Idempotency-Key": "idem-1",
          Authorization: "Bearer token-1",
        },
      }
    );
    expect(response).toEqual({
      applicationId: "APP-1",
      message: "Created",
      raw: { applicationId: "APP-1", message: "Created" },
    });
    expect(result.current.idempotencyKey).toBe("idem-1");
  });

  test("maps and throws submission error", async () => {
    api.post.mockRejectedValue({
      response: {
        status: 400,
        data: { message: "Validation failed" },
      },
    });

    const { result } = renderHook(() => useCreateLoan());
    let thrown;
    await act(async () => {
      try {
        await result.current.createLoan({ amount: 1000 });
      } catch (err) {
        thrown = err;
      }
    });

    expect(thrown).toEqual({
      status: 400,
      message: "Validation failed",
      raw: expect.any(Object),
    });
    expect(result.current.error).toEqual({
      status: 400,
      message: "Validation failed",
      raw: expect.any(Object),
    });
  });

  test("reuses idempotency key for same payload inside dedupe window", async () => {
    api.post.mockResolvedValue({
      data: { applicationId: "APP-2", message: "Created" },
    });
    generateIdempotencyKey.mockReturnValue("idem-fixed");

    const { result } = renderHook(() => useCreateLoan({ dedupeWindowMs: 60000 }));

    await act(async () => {
      await result.current.createLoan({ amount: 1000, tenure: 12 });
    });

    await act(async () => {
      await result.current.createLoan({ tenure: 12, amount: 1000 });
    });

    expect(generateIdempotencyKey).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenNthCalledWith(
      2,
      "/loans/apply",
      { tenure: 12, amount: 1000 },
      {
        headers: {
          "Idempotency-Key": "idem-fixed",
          Authorization: "Bearer token-1",
        },
      }
    );
  });
});
