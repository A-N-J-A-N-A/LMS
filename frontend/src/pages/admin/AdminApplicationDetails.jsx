import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AdminLayout from "../../Components/admin/AdminLayout";
import {
  getApplicationById,
  approveApplication,
  rejectApplication,
  fetchApplicationDocument,
} from "../../services/admin/adminLoanService";
import "../../styles/admin/applicationDetails.css";

function AdminApplicationDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const role = localStorage.getItem("role");

  const [app, setApp] = useState(null);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);

  // Fetch application data
  const fetchApplication = useCallback(async () => {
    try {
      const data = await getApplicationById(id);
      setApp(data);
    } catch (error) {
      navigate("/admin/applications");
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    if (role !== "ADMIN") {
      navigate("/admin/login");
      return;
    }
    fetchApplication();
  }, [role, navigate, fetchApplication]);

  // Approve or reject application
  const handleAction = async (action) => {
    try {
      if (action === "approve") {
        await approveApplication(id, comment);
      } else {
        await rejectApplication(id, comment);
      }
      navigate("/admin/applications");
    } catch (error) {
      alert(error.response?.data?.message || "Action failed");
    }
  };

  // Extract filename from HTTP content-disposition
  const getFilenameFromDisposition = (disposition, fallback) => {
    if (!disposition) return fallback;
    const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1]);
    const simpleMatch = disposition.match(/filename="?([^"]+)"?/i);
    return simpleMatch?.[1] || fallback;
  };

  // Determine file extension from MIME type
  const getExtensionFromContentType = (contentType) => {
    const type = String(contentType || "").toLowerCase();
    if (type.includes("pdf")) return "pdf";
    if (type.includes("jpeg") || type.includes("jpg")) return "jpg";
    if (type.includes("png")) return "png";
    return "bin";
  };

  // View or download documents
  const handleDocumentAction = async (fieldName, download = false) => {
    try {
      const { blob, contentType, contentDisposition } =
        await fetchApplicationDocument(id, fieldName, download);

      const fallback = `${fieldName}.${getExtensionFromContentType(contentType)}`;
      const filename = getFilenameFromDisposition(contentDisposition, fallback);
      const fileUrl = URL.createObjectURL(blob);

      if (download) {
        const anchor = document.createElement("a");
        anchor.href = fileUrl;
        anchor.download = filename;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
      } else {
        window.open(fileUrl, "_blank", "noopener,noreferrer");
      }

      setTimeout(() => URL.revokeObjectURL(fileUrl), 60000);
    } catch (error) {
      alert("Unable to open document");
    }
  };

  // Format keys for display
  const formatKey = (key) =>
    String(key || "")
      .replace(/([A-Z])/g, " $1")
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/^./, (c) => c.toUpperCase());

  // Render values intelligently
  const renderValue = (key, value) => {
    if (value === null || value === undefined || value === "") return "-";
    if (typeof value === "object") return <code>{JSON.stringify(value)}</code>;

    const str = String(value);

    if (str.startsWith("data:")) {
      return (
        <div>
          <button
            type="button"
            className="back-btn"
            onClick={() => handleDocumentAction(key, false)}
          >
            View Document
          </button>{" "}
          <button
            type="button"
            className="approve-btn"
            onClick={() => handleDocumentAction(key, true)}
          >
            Download
          </button>
        </div>
      );
    }

    if (str.startsWith("http://") || str.startsWith("https://")) {
      return (
        <a href={str} target="_blank" rel="noreferrer" className="data-link">
          View Document
        </a>
      );
    }

    return str;
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="details-loading">Loading...</div>
      </AdminLayout>
    );
  }

  if (!app) return null;

  const isReviewed = app.status !== "APPLIED";
  const isKycVerified = String(app.kycStatus || "").toUpperCase() === "VERIFIED";
  const applicationData = app.applicationData || {};

  return (
    <AdminLayout>
      <div className="details-wrapper">
        <div className="details-header">
          <h1>Application Details</h1>
          <button className="back-btn" onClick={() => navigate("/admin/applications")}>
            Back to Applications
          </button>
        </div>

        <div className="details-card">
          <h3 className="section-title">Application Information</h3>
          <table className="details-table">
            <tbody>
              <tr>
                <th>Application ID</th>
                <td>{app.applicationId}</td>
                <th>Customer Name</th>
                <td>{app.customerName || "-"}</td>
              </tr>
              <tr>
                <th>Loan Type</th>
                <td>{app.loanTypeId}</td>
                <th>Amount</th>
                <td>INR {Number(app.amount).toLocaleString()}</td>
              </tr>
              <tr>
                <th>KYC Status</th>
                <td>{app.kycStatus || "UNKNOWN"}</td>
                <th>Reviewed At</th>
                <td>{app.reviewedAt || "-"}</td>
              </tr>
              <tr>
                <th>Status</th>
                <td>
                  <span className={`status ${app.status.toLowerCase()}`}>{app.status}</span>
                </td>
                <th>Reviewed By</th>
                <td>{app.reviewedBy || "-"}</td>
              </tr>
            </tbody>
          </table>

          <h3 className="section-title mt">Application Data</h3>
          {Object.keys(applicationData).length > 0 || app.kycStatus ? (
            <table className="details-table">
              <tbody>
                <tr>
                  <th>KYC Status</th>
                  <td colSpan="3">
                    <span className={`status ${String(app.kycStatus || "unknown").toLowerCase()}`}>
                      {app.kycStatus || "UNKNOWN"}
                    </span>
                  </td>
                </tr>
                {Object.entries(applicationData).map(([key, value]) => (
                  <tr key={key}>
                    <th>{formatKey(key)}</th>
                    <td colSpan="3">{renderValue(key, value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="comment-box">No additional application data available.</div>
          )}

          {app.reviewComment && (
            <>
              <h3 className="section-title mt">Review Comment</h3>
              <div className="comment-box">{app.reviewComment}</div>
            </>
          )}

          {!isReviewed && (
            <>
              <h3 className="section-title mt">Review Application</h3>
              <textarea
                className="review-textarea"
                placeholder="Enter review comment..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              <div className="action-buttons">
                <button
                  className="approve-btn"
                  onClick={() => handleAction("approve")}
                  disabled={!isKycVerified}
                  title={!isKycVerified ? "Loan cannot be approved until KYC is verified." : ""}
                >
                  Approve
                </button>
                <button className="reject-btn" onClick={() => handleAction("reject")}>
                  Reject
                </button>
              </div>
              {!isKycVerified && (
                <p className="details-inline-warning">
                  Loan cannot be approved until KYC is verified.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

export default AdminApplicationDetails;


{/*import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AdminLayout from "../../Components/admin/AdminLayout";
import {
  getApplicationById,
  approveApplication,
  rejectApplication,
  fetchApplicationDocument,
} from "../../services/admin/adminLoanService";
import "../../styles/admin/applicationDetails.css";

function AdminApplicationDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const role = localStorage.getItem("role");

  const [app, setApp] = useState(null);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchApplication = useCallback(async () => {
    try {
      const data = await getApplicationById(id);
      setApp(data);
    } catch (error) {
      navigate("/admin/applications");
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    if (role !== "ADMIN") {
      navigate("/admin/login");
      return;
    }
    fetchApplication();
  }, [role, navigate, fetchApplication]);

  const handleAction = async (action) => {
    try {
      if (action === "approve") {
        await approveApplication(id, comment);
      } else {
        await rejectApplication(id, comment);
      }
      navigate("/admin/applications");
    } catch (error) {
      alert(error.response?.data?.message || "Action failed");
    }
  };

  if (loading) {
    return (
        <AdminLayout>
          <div className="details-loading">Loading...</div>
        </AdminLayout>
    );
  }

  if (!app) return null;

  const isReviewed = app.status !== "APPLIED";
  const isKycVerified = String(app.kycStatus || "").toUpperCase() === "VERIFIED";
  const applicationData = app.applicationData || {};
  const formatKey = (key) =>
      String(key || "")
          .replace(/([A-Z])/g, " $1")
          .replace(/[_-]+/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .replace(/^./, (c) => c.toUpperCase());

  const getFilenameFromDisposition = (disposition, fallback) => {
    if (!disposition) return fallback;
    const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (utf8Match?.[1]) {
      return decodeURIComponent(utf8Match[1]);
    }
    const simpleMatch = disposition.match(/filename="?([^"]+)"?/i);
    return simpleMatch?.[1] || fallback;
  };

  const getExtensionFromContentType = (contentType) => {
    const type = String(contentType || "").toLowerCase();
    if (type.includes("pdf")) return "pdf";
    if (type.includes("jpeg") || type.includes("jpg")) return "jpg";
    if (type.includes("png")) return "png";
    return "bin";
  };

  const handleDocumentAction = async (fieldName, download = false) => {
    try {
      const { blob, contentType, contentDisposition } =
          await fetchApplicationDocument(id, fieldName, download);

      const fallback = `${fieldName}.${getExtensionFromContentType(contentType)}`;
      const filename = getFilenameFromDisposition(contentDisposition, fallback);
      const fileUrl = URL.createObjectURL(blob);

      if (download) {
        const anchor = document.createElement("a");
        anchor.href = fileUrl;
        anchor.download = filename;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
      } else {
        window.open(fileUrl, "_blank", "noopener,noreferrer");
      }

      setTimeout(() => URL.revokeObjectURL(fileUrl), 60000);
    } catch (error) {
      alert("Unable to open document");
    }
  };

  const renderValue = (key, value) => {
    if (value === null || value === undefined || value === "") return "-";
    if (typeof value === "object") {
      return <code>{JSON.stringify(value)}</code>;
    }

    const str = String(value);
    if (str.startsWith("data:")) {
      return (
          <div>
            <button
                type="button"
                className="back-btn"
                onClick={() => handleDocumentAction(key, false)}
            >
              View Document
            </button>
            {" "}
            <button
                type="button"
                className="approve-btn"
                onClick={() => handleDocumentAction(key, true)}
            >
              Download
            </button>
          </div>
      );
    }

    if (str.startsWith("http://") || str.startsWith("https://")) {
      return (
          <a href={str} target="_blank" rel="noreferrer" className="data-link">
            View Document
          </a>
      );
    }

    return str;
  };

  return (
      <AdminLayout>
        <div className="details-wrapper">
          <div className="details-header">
            <h1>Application Details</h1>
            <button className="back-btn" onClick={() => navigate("/admin/applications")}>
              Back to Applications
            </button>
          </div>

          <div className="details-card">
            <h3 className="section-title">Application Information</h3>

            <table className="details-table">
              <tbody>
              <tr>
                <th>Application ID</th>
                <td>{app.applicationId}</td>
                <th>Customer Name</th>
                <td>{app.customerName || "-"}</td>
              </tr>

              <tr>
                <th>Loan Type</th>
                <td>{app.loanTypeId}</td>
                <th>Amount</th>
                <td>INR {Number(app.amount).toLocaleString()}</td>
              </tr>

              <tr>
                <th>KYC Status</th>
                <td>{app.kycStatus || "UNKNOWN"}</td>
                <th>Reviewed At</th>
                <td>{app.reviewedAt || "-"}</td>
              </tr>

              <tr>
                <th>Status</th>
                <td>
                  <span className={`status ${app.status.toLowerCase()}`}>
                    {app.status}
                  </span>
                </td>
                <th>Reviewed By</th>
                <td>{app.reviewedBy || "-"}</td>
              </tr>
              </tbody>
            </table>

            <h3 className="section-title mt">Application Data</h3>
            {Object.keys(applicationData).length > 0 || app.kycStatus ? (
                <table className="details-table">
                  <tbody>
                  <tr>
                    <th>KYC Status</th>
                    <td colSpan="3">
                      <span className={`status ${String(app.kycStatus || "unknown").toLowerCase()}`}>
                        {app.kycStatus || "UNKNOWN"}
                      </span>
                    </td>
                  </tr>
                  {Object.entries(applicationData).map(([key, value]) => (
                      <tr key={key}>
                        <th>{formatKey(key)}</th>
                        <td colSpan="3">{renderValue(key, value)}</td>
                      </tr>
                  ))}
                  </tbody>
                </table>
            ) : (
                <div className="comment-box">No additional application data available.</div>
            )}

            {app.reviewComment && (
                <>
                  <h3 className="section-title mt">Review Comment</h3>
                  <div className="comment-box">{app.reviewComment}</div>
                </>
            )}

            {!isReviewed && (
                <>
                  <h3 className="section-title mt">Review Application</h3>
                  <textarea
                      className="review-textarea"
                      placeholder="Enter review comment..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                  />

                  <div className="action-buttons">
                    <button
                      className="approve-btn"
                      onClick={() => handleAction("approve")}
                      disabled={!isKycVerified}
                      title={!isKycVerified ? "Loan cannot be approved until KYC is verified." : ""}
                    >
                      Approve
                    </button>
                    <button className="reject-btn" onClick={() => handleAction("reject")}>
                      Reject
                    </button>
                  </div>
                  {!isKycVerified && (
                    <p className="details-inline-warning">
                      Loan cannot be approved until KYC is verified.
                    </p>
                  )}
                </>
            )}
          </div>
        </div>
      </AdminLayout>
  );
}

export default AdminApplicationDetails;*/}
