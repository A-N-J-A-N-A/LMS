import api from "../api";

/**
 * ===============================
 * ADMIN DASHBOARD SERVICES
 * ===============================
 */


/**
 * Get Dashboard Stats
 */
export const getDashboardStats = async () => {
  const response = await api.get(
    "/admin/loan-applications/dashboard-stats"
  );

  return response.data;
};

export const getProfitabilitySummary = async () => {
  const response = await api.get("/admin/payments/profitability");
  return response.data;
};
