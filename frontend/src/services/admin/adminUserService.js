import api from "../api";

/**
 * ===============================
 * ADMIN USER SERVICES
 * ===============================
 */

/**
 * Get all customers (role = USER)
 */
export const getAllCustomers = async () => {
  const response = await api.get("/admin/users/customers");
  return response.data;
};

export const getPendingKycApplications = async () => {
  const response = await api.get("/admin/users/kyc/pending");
  return response.data;
};

export const getUserKycDetails = async (userId) => {
  const response = await api.get(`/admin/users/kyc/${userId}`);
  return response.data;
};

export const reviewUserKyc = async (userId, approve, comment) => {
  const response = await api.put(`/admin/users/kyc-review/${userId}`, {
    approve,
    comment,
  });
  return response.data;
};
