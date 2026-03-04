import api from "../api";

/**
 * ===============================
 * ADMIN LOAN APPLICATION SERVICES
 * ===============================
 */


/**
 * Get All Applications
 * Optional status filter
 */
export const getAllApplications = async (status) => {
  const response = await api.get(
    "/admin/loan-applications",
    {
      params: status ? { status } : {},
    }
  );

  return response.data;
};


/**
 * Get Single Application
 */
export const getApplicationById = async (id) => {
  const response = await api.get(
    `/admin/loan-applications/${id}`
  );

  return response.data;
};

export const getActiveLoans = async () => {
  try {
    const response = await api.get("/admin/loan-applications/active-loans");
    return response.data;
  } catch (error) {
    if (error.response?.status !== 404) {
      throw error;
    }

    const [disbursedRes, activeRes] = await Promise.all([
      api.get("/admin/loan-applications", { params: { status: "DISBURSED" } }),
      api.get("/admin/loan-applications", { params: { status: "ACTIVE" } }),
    ]);

    const baseApps = [
      ...(Array.isArray(disbursedRes.data) ? disbursedRes.data : []),
      ...(Array.isArray(activeRes.data) ? activeRes.data : []),
    ];

    const trackerRows = await Promise.all(
      baseApps.map(async (app) => {
        try {
          const tracker = await getLoanRepaymentTracker(app.applicationId);
          const nextDueDate =
            (tracker.repaymentSchedule || [])
              .find((row) => String(row.status || "").toLowerCase() !== "paid")
              ?.dueDate || "-";

          return {
            applicationId: tracker.applicationId,
            userId: tracker.userId,
            customerName: tracker.customerName,
            loanTypeId: tracker.loanTypeId,
            status: tracker.status,
            sanctionedAmount: tracker.sanctionedAmount,
            disbursedAmount: tracker.disbursedAmount,
            tenure: tracker.tenure,
            disbursedAt: tracker.disbursedAt,
            nextDueDate,
            totalInstallments: tracker.totalInstallments,
            paidInstallments: tracker.paidInstallments,
            totalPaidAmount: tracker.totalPaidAmount,
            outstandingAmount: tracker.outstandingAmount,
          };
        } catch (trackerError) {
          return {
            applicationId: app.applicationId,
            userId: app.userId,
            customerName: app.customerName,
            loanTypeId: app.loanTypeId,
            status: app.status,
            sanctionedAmount: app.sanctionedAmount ?? app.amount ?? 0,
            disbursedAmount: app.disbursedAmount ?? app.amount ?? 0,
            tenure: app.tenure,
            disbursedAt: null,
            nextDueDate: "-",
            totalInstallments: app.tenure || 0,
            paidInstallments: 0,
            totalPaidAmount: 0,
            outstandingAmount: app.amount || 0,
          };
        }
      })
    );

    return trackerRows;
  }
};

export const getLoanRepaymentTracker = async (id) => {
  const response = await api.get(`/admin/loan-applications/${id}/repayment-tracker`);
  return response.data;
};


/**
 * Approve Application
 */
export const approveApplication = async (id, comment) => {
  const response = await api.put(
    `/admin/loan-applications/approve/${id}`,
    { comment }
  );

  return response.data;
};


/**
 * Reject Application
 */
export const rejectApplication = async (id, comment) => {
  const response = await api.put(
    `/admin/loan-applications/reject/${id}`,
    { comment }
  );

  return response.data;
};

export const disburseLoan = async (id, amount) => {
  const response = await api.post(
    `/admin/loan-applications/disburse/${id}`,
    { amount }
  );
  return response.data;
};

/**
 * Fetch document blob for admin view/download
 */
export const fetchApplicationDocument = async (id, fieldName, download = false) => {
  const response = await api.get(
    `/admin/loan-applications/${id}/documents/${encodeURIComponent(fieldName)}`,
    {
      params: { download },
      responseType: "blob",
    }
  );

  return {
    blob: response.data,
    contentType: response.headers["content-type"] || "application/octet-stream",
    contentDisposition: response.headers["content-disposition"] || "",
  };
};
