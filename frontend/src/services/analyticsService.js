const API_BASE_URL = "http://localhost:8080";
const SESSION_KEY = "analytics_session_id";

const ensureSessionId = () => {
  let sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
};

const buildPayload = (eventType, pagePath, extra = {}) => ({
  sessionId: ensureSessionId(),
  eventType,
  pagePath,
  durationMs: typeof extra.durationMs === "number" ? Math.max(0, Math.round(extra.durationMs)) : null,
  metadata: extra.metadata || null,
});

const authHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const trackEvent = async (eventType, pagePath, extra = {}) => {
  try {
    await fetch(`${API_BASE_URL}/analytics/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify(buildPayload(eventType, pagePath, extra)),
      keepalive: true,
    });
  } catch (error) {
    // intentionally swallow analytics failures
  }
};

export const trackExitWithBeacon = (pagePath, durationMs) => {
  try {
    const payload = JSON.stringify(buildPayload("PAGE_EXIT", pagePath, { durationMs }));
    const blob = new Blob([payload], { type: "application/json" });
    navigator.sendBeacon(`${API_BASE_URL}/analytics/events`, blob);
  } catch (error) {
    // intentionally swallow analytics failures
  }
};
