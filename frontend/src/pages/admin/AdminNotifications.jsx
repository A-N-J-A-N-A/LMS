import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../Components/admin/AdminLayout";
import {
  getAdminPrepaymentRequests,
  reviewPrepaymentRequest,
} from "../../services/admin/adminPrepaymentService";
import {
  getAdminForeclosureRequests,
  reviewForeclosureRequest,
} from "../../services/admin/adminForeclosureService.js";
import "../../styles/admin/notifications.css";

function AdminNotifications() {
  const navigate = useNavigate();
  const role = localStorage.getItem("role");
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [requests, setRequests] = useState([]);
  const [requestType, setRequestType] = useState("PREPAYMENT");
  const [search, setSearch] = useState("");
  const [reviewComments, setReviewComments] = useState({});

  const fetchRequests = useCallback(async () => {
    try {
      const data = requestType === "FORECLOSURE"
        ? await getAdminForeclosureRequests(statusFilter || "")
        : await getAdminPrepaymentRequests(statusFilter || "");
      setRequests(Array.isArray(data) ? data : []);
    } catch (error) {
      alert("Failed to load notifications");
    }
  }, [statusFilter, requestType]);

  useEffect(() => {
    if (role !== "ADMIN") {
      navigate("/admin/login");
      return;
    }
    fetchRequests();
  }, [role, navigate, fetchRequests]);

  const formatDate = (value) => {
    if (!value) return "-";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "-";
    return parsed.toLocaleString("en-IN");
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return requests;
    return requests.filter((item) =>
        String(item.customerName || "").toLowerCase().includes(q) ||
        String(item.loanApplicationId || "").toLowerCase().includes(q) ||
        String(item.status || "").toLowerCase().includes(q)
    );
  }, [requests, search]);

  const handleReview = async (id, approve) => {
    try {
      if (requestType === "FORECLOSURE") {
        await reviewForeclosureRequest(id, approve, reviewComments[id] || "");
      } else {
        await reviewPrepaymentRequest(id, approve, reviewComments[id] || "");
      }
      await fetchRequests();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to review request");
    }
  };

  return (
      <AdminLayout>
        <div className="applications-page">
          <h1 className="page-title">Admin Notifications</h1>

          <div className="controls">
            <select value={requestType} onChange={(e) => setRequestType(e.target.value)}>
              <option value="PREPAYMENT">Prepayment</option>
              <option value="FORECLOSURE">Foreclosure</option>
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
            <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by customer or application ID..."
            />
          </div>

          <div className="table-card">
            <table>
              <thead>
              <tr>
                <th>Customer</th>
                <th>Application ID</th>
                <th>Requested Amount</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Requested At</th>
                <th>Review Comment</th>
                <th>Action</th>
              </tr>
              </thead>
              <tbody>
              {filtered.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="no-data">
                      {requestType === "FORECLOSURE"
                        ? "No foreclosure requests found"
                        : "No prepayment requests found"}
                    </td>
                  </tr>
              ) : (
                  filtered.map((item) => {
                    const isPending = item.status === "PENDING";
                    return (
                        <tr key={item.id}>
                          <td>{item.customerName || "-"}</td>
                          <td>{item.loanApplicationId}</td>
                          <td>INR {Number(item.requestedAmount || 0).toLocaleString()}</td>
                          <td>{item.reason || "-"}</td>
                          <td>
                            <span className={`status ${String(item.status || "").toLowerCase()}`}>
                              {item.status}
                            </span>
                          </td>
                          <td>{formatDate(item.requestedAt)}</td>
                          <td>
                            {isPending ? (
                                <textarea
                                    className="review-input"
                                    placeholder="Optional admin comment..."
                                    value={reviewComments[item.id] || ""}
                                    onChange={(e) =>
                                        setReviewComments((prev) => ({
                                          ...prev,
                                          [item.id]: e.target.value,
                                        }))
                                    }
                                />
                            ) : (
                                item.reviewComment || "-"
                            )}
                          </td>
                          <td>
                            {isPending ? (
                                <div className="review-actions">
                                  <button
                                      type="button"
                                      className="approve-btn"
                                      onClick={() => handleReview(item.id, true)}
                                  >
                                    Approve
                                  </button>
                                  <button
                                      type="button"
                                      className="reject-btn"
                                      onClick={() => handleReview(item.id, false)}
                                  >
                                    Reject
                                  </button>
                                </div>
                            ) : (
                                "-"
                            )}
                          </td>
                        </tr>
                    );
                  })
              )}
              </tbody>
            </table>
          </div>
        </div>
      </AdminLayout>
  );
}

export default AdminNotifications;