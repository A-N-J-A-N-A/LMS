import api from "../api";

export const getAdminAnalyticsSummary = async (days = 7) => {
  const response = await api.get("/admin/analytics/summary", {
    params: { days },
  });
  return response.data;
};
