import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "../../Components/admin/AdminLayout";
import {
  disburseLoan,
  getAllApplications,
} from "../../services/admin/adminLoanService";
import "../../styles/admin/disbursement.css";

function AdminLoanDisbursement() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const role = localStorage.getItem("role");

  const [amountInputs, setAmountInputs] = useState({});
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [submittingId, setSubmittingId] = useState("");
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const ITEMS_PER_PAGE = 6;

  // ✅ Redirect (moved inside useEffect to avoid hook errors)
  useEffect(() => {
    if (role !== "ADMIN") {
      navigate("/admin/login");
    }
  }, [role, navigate]);

  // ✅ TanStack Query (replaces fetch + loading + setApplications)
  const {
    data: applications = [],
    isLoading,
  } = useQuery({
    queryKey: ["approvedApplications"],
    queryFn: async () => {
      const data = await getAllApplications("APPROVED");
      return Array.isArray(data) ? data : [];
    },
    enabled: role === "ADMIN",
  });

  // ✅ Initialize amount inputs when applications load
  useEffect(() => {
    if (applications.length > 0) {
      setAmountInputs((prev) => {
        const next = { ...prev };
        applications.forEach((item) => {
          if (next[item.applicationId] === undefined) {
            next[item.applicationId] = item.amount;
          }
        });
        return next;
      });
    }
  }, [applications]);

  // ✅ Search filter (unchanged logic)
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return applications;
    return applications.filter(
      (app) =>
        String(app.applicationId || "").toLowerCase().includes(q) ||
        String(app.customerName || "").toLowerCase().includes(q) ||
        String(app.loanTypeId || "").toLowerCase().includes(q)
    );
  }, [applications, search]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedApplications = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // ✅ TanStack Mutation (replaces handleDisburse async + refetch)
  const disburseMutation = useMutation({
    mutationFn: ({ applicationId, amount }) =>
      disburseLoan(applicationId, amount),
    onSuccess: (_, variables) => {
      setFeedback({
        type: "success",
        message: `Loan ${variables.applicationId} disbursed successfully.`,
      });
      queryClient.invalidateQueries(["approvedApplications"]);
      setSubmittingId("");
    },
    onError: (error) => {
      setFeedback({
        type: "error",
        message: error.response?.data?.message || "Failed to disburse loan.",
      });
      setSubmittingId("");
    },
  });

  const handleDisburse = (app) => {
    const raw = amountInputs[app.applicationId];
    const amount = Number(raw);

    if (!Number.isFinite(amount) || amount <= 0) {
      setFeedback({
        type: "error",
        message: "Please enter a valid disbursement amount.",
      });
      return;
    }

    setFeedback({ type: "", message: "" });
    setSubmittingId(app.applicationId);

    disburseMutation.mutate({
      applicationId: app.applicationId,
      amount,
    });
  };

  return (
    <AdminLayout>
      <div className="admin-disbursement-page">
        <h1 className="admin-page-title">Loan Disbursement</h1>
        <p className="admin-page-subtitle">
          Approved applications ready for disbursement.
        </p>

        {feedback.message && (
          <p
            className={`admin-feedback ${
              feedback.type === "error"
                ? "admin-feedback-error"
                : "admin-feedback-success"
            }`}
            role="alert"
          >
            {feedback.message}
          </p>
        )}

        <div className="admin-disbursement-controls">
          <input
            className="admin-input"
            placeholder="Search by application, customer, loan type"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="admin-card admin-disbursement-table-wrap">
          {isLoading ? (
            <p>Loading approved applications...</p>
          ) : filtered.length === 0 ? (
            <p>No approved applications available for disbursement.</p>
          ) : (
            <table className="admin-disbursement-table">
              <thead>
                <tr>
                  <th>Application ID</th>
                  <th>Customer</th>
                  <th>Loan Type</th>
                  <th>Approved Amount</th>
                  <th>Disbursement Amount</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedApplications.map((app) => (
                  <tr key={app.applicationId}>
                    <td>{app.applicationId}</td>
                    <td>{app.customerName || "-"}</td>
                    <td>{app.loanTypeId || "-"}</td>
                    <td>
                      INR{" "}
                      {Number(app.amount || 0).toLocaleString("en-IN")}
                    </td>
                    <td>
                      <input
                        type="number"
                        min="1"
                        step="0.01"
                        className="admin-input disbursement-amount-input"
                        value={amountInputs[app.applicationId] ?? ""}
                        onChange={(e) =>
                          setAmountInputs((prev) => ({
                            ...prev,
                            [app.applicationId]: e.target.value,
                          }))
                        }
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="admin-btn admin-btn-primary"
                        onClick={() => handleDisburse(app)}
                        disabled={submittingId === app.applicationId}
                      >
                        {submittingId === app.applicationId
                          ? "Disbursing..."
                          : "Provide Loan"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {!isLoading && filtered.length > 0 && (
            <div className="admin-disbursement-pagination">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => prev - 1)}
              >
                Prev
              </button>
              <span>
                Page {currentPage} of {totalPages || 1}
              </span>
              <button
                type="button"
                disabled={currentPage === totalPages || totalPages === 0}
                onClick={() => setCurrentPage((prev) => prev + 1)}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

export default AdminLoanDisbursement;


{/*import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../Components/admin/AdminLayout";
import {
  disburseLoan,
  getAllApplications,
} from "../../services/admin/adminLoanService";
import "../../styles/admin/disbursement.css";

function AdminLoanDisbursement() {
  const itemsPerPage = 6;
  const navigate = useNavigate();
  const role = localStorage.getItem("role");
  const [applications, setApplications] = useState([]);
  const [amountInputs, setAmountInputs] = useState({});
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState("");
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  const fetchApprovedApplications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllApplications("APPROVED");
      const list = Array.isArray(data) ? data : [];
      setApplications(list);
      setAmountInputs((prev) => {
        const next = { ...prev };
        list.forEach((item) => {
          if (next[item.applicationId] === undefined) {
            next[item.applicationId] = item.amount;
          }
        });
        return next;
      });
    } catch (error) {
      setFeedback({ type: "error", message: "Failed to load approved applications." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (role !== "ADMIN") {
      navigate("/admin/login");
      return;
    }
    setFeedback({ type: "", message: "" });
    fetchApprovedApplications();
  }, [role, navigate, fetchApprovedApplications]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return applications;
    return applications.filter((app) =>
      String(app.applicationId || "").toLowerCase().includes(q) ||
      String(app.customerName || "").toLowerCase().includes(q) ||
      String(app.loanTypeId || "").toLowerCase().includes(q)
    );
  }, [applications, search]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentData = filtered.slice(startIndex, startIndex + itemsPerPage);

  const handleDisburse = async (app) => {
    const raw = amountInputs[app.applicationId];
    const amount = Number(raw);

    if (!Number.isFinite(amount) || amount <= 0) {
      setFeedback({ type: "error", message: "Please enter a valid disbursement amount." });
      return;
    }

    setFeedback({ type: "", message: "" });
    setSubmittingId(app.applicationId);
    try {
      await disburseLoan(app.applicationId, amount);
      setFeedback({
        type: "success",
        message: `Loan ${app.applicationId} disbursed successfully.`,
      });
      await fetchApprovedApplications();
    } catch (error) {
      setFeedback({
        type: "error",
        message: error.response?.data?.message || "Failed to disburse loan.",
      });
    } finally {
      setSubmittingId("");
    }
  };

  return (
    <AdminLayout>
      <div className="admin-disbursement-page">
        <h1 className="admin-page-title">Loan Disbursement</h1>
        <p className="admin-page-subtitle">Approved applications ready for disbursement.</p>
        {feedback.message && (
          <p
            className={`admin-feedback ${
              feedback.type === "error" ? "admin-feedback-error" : "admin-feedback-success"
            }`}
            role="alert"
          >
            {feedback.message}
          </p>
        )}

        <div className="admin-disbursement-controls">
          <input
            className="admin-input"
            placeholder="Search by application, customer, loan type"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        <div className="admin-card admin-disbursement-table-wrap">
          {loading ? (
            <p>Loading approved applications...</p>
          ) : currentData.length === 0 ? (
            <p>No approved applications available for disbursement.</p>
          ) : (
            <>
              <table className="admin-disbursement-table">
                <thead>
                  <tr>
                    <th>Application ID</th>
                    <th>Customer</th>
                    <th>Loan Type</th>
                    <th>Approved Amount</th>
                    <th>Disbursement Amount</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {currentData.map((app) => (
                    <tr key={app.applicationId}>
                      <td>{app.applicationId}</td>
                      <td>{app.customerName || "-"}</td>
                      <td>{app.loanTypeId || "-"}</td>
                      <td>INR {Number(app.amount || 0).toLocaleString("en-IN")}</td>
                      <td>
                        <input
                          type="number"
                          min="1"
                          step="0.01"
                          className="admin-input disbursement-amount-input"
                          value={amountInputs[app.applicationId] ?? ""}
                          onChange={(e) =>
                            setAmountInputs((prev) => ({
                              ...prev,
                              [app.applicationId]: e.target.value,
                            }))
                          }
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="admin-btn admin-btn-primary"
                          onClick={() => handleDisburse(app)}
                          disabled={submittingId === app.applicationId}
                        >
                          {submittingId === app.applicationId ? "Disbursing..." : "Provide Loan"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="admin-disbursement-pagination">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((prev) => prev - 1)}
                >
                  Prev
                </button>
                <span>
                  Page {currentPage} of {totalPages || 1}
                </span>
                <button
                  type="button"
                  disabled={currentPage === totalPages || totalPages === 0}
                  onClick={() => setCurrentPage((prev) => prev + 1)}
                >
                  Next
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

export default AdminLoanDisbursement;*/}
