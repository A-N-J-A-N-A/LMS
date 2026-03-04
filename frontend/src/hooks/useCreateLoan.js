import { useCallback, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { generateIdempotencyKey } from "../utils/idempotencyKey";

const stableStringify = (value) => {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  const keys = Object.keys(value).sort();
  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
    .join(",")}}`;
};

const mapLoanCreationResponse = (responseData) => ({
  applicationId: responseData?.applicationId || "",
  message: responseData?.message || "",
  raw: responseData,
});

const mapLoanCreationError = (error) => {
  const status = error?.response?.status;
  const message =
    error?.response?.data?.message ||
    (status === 401 ? "Please login again to continue" : "Loan application failed");

  return {
    status: status || 0,
    message,
    raw: error,
  };
};

export default function useCreateLoan(options = {}) {
  const {
    onSuccess,
    onError,
    mapResponse = mapLoanCreationResponse,
    mapError = mapLoanCreationError,
    dedupeWindowMs = 300000,
  } = options;
  const { token } = useAuth();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [response, setResponse] = useState(null);
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [recentAttempt, setRecentAttempt] = useState(null);

  const createLoan = useCallback(
    async (requestPayload) => {
      const payloadFingerprint = stableStringify(requestPayload);
      const now = Date.now();
      const hasReusableAttempt =
        recentAttempt &&
        recentAttempt.payloadFingerprint === payloadFingerprint &&
        now - recentAttempt.createdAt <= dedupeWindowMs;

      const currentIdempotencyKey = hasReusableAttempt
        ? recentAttempt.idempotencyKey
        : generateIdempotencyKey();

      setIdempotencyKey(currentIdempotencyKey);
      setIsSubmitting(true);
      setError(null);

      try {
        const apiResponse = await api.post("/loans/apply", requestPayload, {
          headers: {
            "Idempotency-Key": currentIdempotencyKey,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        const mappedResponse = mapResponse(apiResponse.data, apiResponse);
        setResponse(mappedResponse);
        setRecentAttempt({
          payloadFingerprint,
          idempotencyKey: currentIdempotencyKey,
          createdAt: now,
        });
        if (onSuccess) onSuccess(mappedResponse, apiResponse);
        return mappedResponse;
      } catch (err) {
        const mappedError = mapError(err);
        setError(mappedError);
        if (onError) onError(mappedError, err);
        throw mappedError;
      } finally {
        setIsSubmitting(false);
      }
    },
    [dedupeWindowMs, mapError, mapResponse, onError, onSuccess, recentAttempt, token]
  );

  return {
    createLoan,
    isSubmitting,
    error,
    response,
    idempotencyKey,
  };
}
