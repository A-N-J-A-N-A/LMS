import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../Components/admin/AdminLayout";
import {
  getPendingKycApplications,
  getUserKycDetails,
  reviewUserKyc,
} from "../../services/admin/adminUserService";
import "../../styles/admin/kyc.css";

function AdminKycApplications() {
  const itemsPerPage = 6;
  const navigate = useNavigate();
  const role = localStorage.getItem("role");
  const [queue, setQueue] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [details, setDetails] = useState(null);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPendingKycApplications();
      const list = Array.isArray(data) ? data : [];
      setQueue(list);

      if (list.length === 0) {
        setSelectedUserId("");
        setDetails(null);
        return;
      }

      const nextSelected =
        selectedUserId && list.some((item) => item.userId === selectedUserId)
          ? selectedUserId
          : list[0].userId;
      setSelectedUserId(nextSelected);
    } catch (error) {
      alert("Failed to load pending KYC applications");
    } finally {
      setLoading(false);
    }
  }, [selectedUserId]);

  useEffect(() => {
    if (role !== "ADMIN") {
      navigate("/admin/login");
      return;
    }
    fetchQueue();
  }, [role, navigate, fetchQueue]);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!selectedUserId) {
        setDetails(null);
        return;
      }

      try {
        const data = await getUserKycDetails(selectedUserId);
        setDetails(data);
      } catch (error) {
        alert("Failed to load KYC details");
      }
    };

    fetchDetails();
  }, [selectedUserId]);

  const filteredQueue = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return queue;
    return queue.filter((item) =>
      String(item.fullName || "").toLowerCase().includes(query) ||
      String(item.email || "").toLowerCase().includes(query) ||
      String(item.mobile || "").includes(query)
    );
  }, [queue, search]);

  const totalPages = Math.ceil(filteredQueue.length / itemsPerPage);

  const paginatedQueue = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredQueue.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredQueue, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  useEffect(() => {
    const maxPage = Math.max(1, totalPages || 1);
    if (currentPage > maxPage) {
      setCurrentPage(maxPage);
    }
  }, [currentPage, totalPages]);

  const selectedQueueItem = useMemo(
    () => queue.find((item) => item.userId === selectedUserId) || null,
    [queue, selectedUserId]
  );

  const salarySlips = useMemo(
    () =>
      [
        details?.salarySlip1,
        details?.salarySlip2,
        details?.salarySlip3,
        details?.salarySlip4,
        details?.salarySlip5,
        details?.salarySlip6,
      ].filter(Boolean),
    [details]
  );

  const formatDateTime = (value) => {
    if (!value) return "-";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "-";
    return parsed.toLocaleString("en-IN");
  };

  const getStatusBadgeClass = (status) => {
    const normalized = String(status || "").toLowerCase();
    if (normalized === "verified" || normalized === "approved") return "ok";
    if (normalized === "rejected") return "fail";
    return "pending";
  };

  const getExtensionFromContentType = (contentType) => {
    const type = String(contentType || "").toLowerCase();
    if (type.includes("pdf")) return "pdf";
    if (type.includes("jpeg") || type.includes("jpg")) return "jpg";
    if (type.includes("png")) return "png";
    if (type.includes("webp")) return "webp";
    return "bin";
  };

  const toDataUriIfBareBase64 = (raw) => {
    const value = String(raw || "").trim();
    if (!value) return null;
    if (value.startsWith("data:")) return value;
    if (/^https?:\/\//i.test(value)) return value;

    const isLikelyBase64 = /^[A-Za-z0-9+/=\r\n]+$/.test(value);
    if (!isLikelyBase64) return value;

    // Documents uploaded from forms are stored as base64. If prefix is missing,
    // treat as generic binary for robust preview/download.
    return `data:application/octet-stream;base64,${value.replace(/\s+/g, "")}`;
  };

  const openBlobInNewTab = (blob) => {
    const fileUrl = URL.createObjectURL(blob);
    window.open(fileUrl, "_blank", "noopener,noreferrer");
    setTimeout(() => URL.revokeObjectURL(fileUrl), 60000);
  };

  const downloadBlob = (blob, filename) => {
    const fileUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = fileUrl;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setTimeout(() => URL.revokeObjectURL(fileUrl), 60000);
  };

  const handleKycDocumentAction = async (value, label, download = false) => {
    const resolved = toDataUriIfBareBase64(value);
    if (!resolved) return;

    try {
      if (/^https?:\/\//i.test(resolved)) {
        if (download) {
          const anchor = document.createElement("a");
          anchor.href = resolved;
          anchor.download = `${label.replace(/\s+/g, "-").toLowerCase()}`;
          anchor.target = "_blank";
          anchor.rel = "noreferrer";
          document.body.appendChild(anchor);
          anchor.click();
          document.body.removeChild(anchor);
          return;
        }
        window.open(resolved, "_blank", "noopener,noreferrer");
        return;
      }

      const response = await fetch(resolved);
      const blob = await response.blob();
      if (download) {
        const extension = getExtensionFromContentType(blob.type);
        const filename = `${label.replace(/\s+/g, "-").toLowerCase()}.${extension}`;
        downloadBlob(blob, filename);
      } else {
        openBlobInNewTab(blob);
      }
    } catch (error) {
      alert("Unable to open document");
    }
  };

  const renderDocumentActions = (value, label) => {
    if (!value || !String(value).trim()) return <span className="kyc-empty">Not uploaded</span>;
    return (
      <div className="kyc-doc-actions">
        <button
          type="button"
          className="admin-doc-btn admin-doc-btn-view"
          onClick={() => handleKycDocumentAction(value, label, false)}
        >
          View
        </button>
        <button
          type="button"
          className="admin-doc-btn admin-doc-btn-download"
          onClick={() => handleKycDocumentAction(value, label, true)}
        >
          Download
        </button>
      </div>
    );
  };

  const handleReview = async (approve) => {
    if (!selectedUserId) return;
    setActionLoading(true);
    try {
      await reviewUserKyc(selectedUserId, approve, comment);
      setComment("");
      await fetchQueue();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to review KYC");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="admin-kyc-page">
        <div className="admin-kyc-headerbar">
          <div>
            <h1 className="admin-page-title">KYC Verification Queue</h1>
            <p className="admin-page-subtitle">
              Loan Operations Desk: review submitted KYC and close verification with audit-ready comments.
            </p>
          </div>
        </div>

        <div className="admin-kyc-grid">
          <section className="admin-card admin-kyc-list">
            <div className="admin-kyc-list-header">
              <h3>Pending KYC ({queue.length})</h3>
              <input
                className="admin-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name/email/mobile"
              />
            </div>

            {loading ? (
              <p>Loading pending KYC applications...</p>
            ) : filteredQueue.length === 0 ? (
              <p>No pending KYC applications.</p>
            ) : (
              <>
                <div className="admin-kyc-list-items">
                  {paginatedQueue.map((item) => (
                    <button
                      key={item.userId}
                      type="button"
                      className={`admin-kyc-item ${selectedUserId === item.userId ? "active" : ""}`}
                      onClick={() => setSelectedUserId(item.userId)}
                    >
                      <div className="admin-kyc-item-topline">
                        <strong>{item.fullName || "-"}</strong>
                        <span className="admin-kyc-item-userid">{item.userId || "-"}</span>
                      </div>
                      <span>{item.email || "-"}</span>
                      <span>{item.mobile || "-"}</span>
                    </button>
                  ))}
                </div>
                <div className="admin-kyc-pagination">
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
          </section>

          <section className="admin-card admin-kyc-details">
            {!details ? (
              <p>Select a pending KYC application to review details.</p>
            ) : (
              <>
                <div className="admin-kyc-details-head">
                  <div>
                    <h3>Customer KYC Details</h3>
                    <p className="admin-kyc-details-sub">
                      Case ID: {selectedQueueItem?.userId || details.userId || "-"}
                    </p>
                  </div>
                  <span className={`status-badge ${getStatusBadgeClass(details.kycStatus)}`}>
                    {details.kycStatus || "SUBMITTED"}
                  </span>
                </div>

                <div className="admin-kyc-detail-grid">
                  <div className="admin-kyc-field">
                    <span className="admin-kyc-label">Name</span>
                    <span className="admin-kyc-value">{details.fullName || "-"}</span>
                  </div>
                  <div className="admin-kyc-field">
                    <span className="admin-kyc-label">Email</span>
                    <span className="admin-kyc-value">{details.email || "-"}</span>
                  </div>
                  <div className="admin-kyc-field">
                    <span className="admin-kyc-label">Mobile</span>
                    <span className="admin-kyc-value">{details.mobile || "-"}</span>
                  </div>
                  <div className="admin-kyc-field">
                    <span className="admin-kyc-label">Status</span>
                    <span className="admin-kyc-value">{details.kycStatus || "-"}</span>
                  </div>
                  <div className="admin-kyc-field">
                    <span className="admin-kyc-label">Full Name as PAN</span>
                    <span className="admin-kyc-value">{details.fullNameAsPan || "-"}</span>
                  </div>
                  <div className="admin-kyc-field">
                    <span className="admin-kyc-label">Date of Birth</span>
                    <span className="admin-kyc-value">{details.dateOfBirth || "-"}</span>
                  </div>
                  <div className="admin-kyc-field">
                    <span className="admin-kyc-label">Gender</span>
                    <span className="admin-kyc-value">{details.gender || "-"}</span>
                  </div>
                  <div className="admin-kyc-field">
                    <span className="admin-kyc-label">Marital Status</span>
                    <span className="admin-kyc-value">{details.maritalStatus || "-"}</span>
                  </div>
                  <div className="admin-kyc-field">
                    <span className="admin-kyc-label">Employment Type</span>
                    <span className="admin-kyc-value">{details.employmentType || "-"}</span>
                  </div>
                </div>

                <div className="admin-kyc-documents">
                  <h4>Documents</h4>
                  <div className="admin-kyc-doc-grid">
                    <div className="admin-kyc-field">
                      <span className="admin-kyc-label">PAN Card</span>
                      <span className="admin-kyc-value">{renderDocumentActions(details.panCard, "PAN Card")}</span>
                    </div>
                    <div className="admin-kyc-field">
                      <span className="admin-kyc-label">Aadhaar Card</span>
                      <span className="admin-kyc-value">{renderDocumentActions(details.aadhaarCard, "Aadhaar Card")}</span>
                    </div>
                    {details.bankStatement && String(details.bankStatement).trim() && (
                      <div className="admin-kyc-field">
                        <span className="admin-kyc-label">Bank Statement</span>
                        <span className="admin-kyc-value">{renderDocumentActions(details.bankStatement, "Bank Statement")}</span>
                      </div>
                    )}
                  </div>
                  {salarySlips.length > 0 && (
                    <div className="admin-kyc-slip-list">
                      {salarySlips.map((slip, index) => (
                        <div key={`${details.userId}-slip-${index + 1}`} className="admin-kyc-field">
                          <span className="admin-kyc-label">Salary Slip {index + 1}</span>
                          <span className="admin-kyc-value">{renderDocumentActions(slip, `Salary Slip ${index + 1}`)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="admin-kyc-review-panel">
                  <label htmlFor="kycComment">Admin Comment</label>
                  <textarea
                    id="kycComment"
                    className="admin-textarea"
                    rows={4}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Add comment for approval/rejection"
                  />
                  <div className="admin-kyc-actions">
                    <button
                      type="button"
                      className="admin-btn admin-btn-primary"
                      onClick={() => handleReview(true)}
                      disabled={actionLoading}
                    >
                      Approve KYC
                    </button>
                    <button
                      type="button"
                      className="admin-btn admin-btn-danger"
                      onClick={() => handleReview(false)}
                      disabled={actionLoading}
                    >
                      Reject KYC
                    </button>
                  </div>
                  {details.kycReviewedAt && (
                    <p className="admin-kyc-reviewed-meta">
                      Last reviewed by {details.kycReviewedBy || "-"} at {formatDateTime(details.kycReviewedAt)}
                    </p>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </AdminLayout>
  );
}

export default AdminKycApplications;
