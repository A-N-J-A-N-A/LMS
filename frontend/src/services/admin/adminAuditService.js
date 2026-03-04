import api from "../api";

export const getAllAuditLogs = async () => {
  const response = await api.get("/audit/all");
  return response.data;
};
