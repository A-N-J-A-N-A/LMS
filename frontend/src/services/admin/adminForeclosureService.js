import api from "../api";

export const getAdminForeclosureRequests = async (status) => {
  const response = await api.get("/admin/foreclosure-requests", {
    params: status ? { status } : {},
  });
  return response.data;
};

export const reviewForeclosureRequest = async (id, approve, comment) => {
  const response = await api.put(`/admin/foreclosure-requests/${id}/review`, {
    approve,
    comment,
  });
  return response.data;
};
