import api from "../api";

export const getAdminPrepaymentRequests = async (status) => {
  const response = await api.get("/admin/prepayment-requests", {
    params: status ? { status } : {},
  });
  return response.data;
};

export const reviewPrepaymentRequest = async (id, approve, comment) => {
  const response = await api.put(`/admin/prepayment-requests/${id}/review`, {
    approve,
    comment,
  });
  return response.data;
};
