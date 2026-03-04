import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import "../../styles/ActiveLoans.css";

function ActiveLoans({ token }) {

  const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:8080";

  const fetchApplications = async () => {
    const res = await fetch(`${apiUrl}/user/applications`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || "Failed to fetch applications");
    }

    const data = await res.json();

    return Array.isArray(data)
      ? [...data].sort(
          (a, b) =>
            new Date(b.createdAt || 0) -
            new Date(a.createdAt || 0)
        )
      : [];
  };

  const {
    data: applications = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["applications", token],
    queryFn: fetchApplications,
    enabled: !!token, // only run if token exists
  });

  const summary = useMemo(() => {
    const totalAmount = applications.reduce(
      (sum, app) => sum + Number(app.amount || 0),
      0
    );
    return { totalAmount, count: applications.length };
  }, [applications]);

  const formatStatusClass = (status) => {
    const value = String(status || "").toLowerCase();
    if (value.includes("approved")) return "status-approved";
    if (value.includes("rejected")) return "status-rejected";
    if (value.includes("closed")) return "status-closed";
    return "status-pending";
  };

  const formatLoanType = (loanTypeId) =>
    String(loanTypeId || "-")
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());

  const formatAmount = (value) =>
    `Rs ${Number(value || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const formatDate = (value) => {
    if (!value) return "-";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString("en-GB");
  };

  const formatStatus = (status) =>
    String(status || "-")
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());

  if (isLoading) return <p>Loading loan applications...</p>;
  if (error) return <p className="error-text">{error.message}</p>;
  if (applications.length === 0) return <p>No loan applications found.</p>;

  return (
    <div className="applications-block">
      <div className="applications-summary">
        <div>
          <p className="applications-label">Applications</p>
          <h4>{summary.count}</h4>
        </div>
        <div>
          <p className="applications-label">Total Applied Amount</p>
          <h4>{formatAmount(summary.totalAmount)}</h4>
        </div>
      </div>

      <div className="applications-list">
        {applications.map((app, index) => (
          <article
            className="application-card"
            key={app.applicationId || app.id || app._id || `loan-app-${index}`}
          >
            <header className="application-head">
              <div>
                <h4>
                  {`${formatLoanType(app.loanTypeId)} | ${
                    app.applicationId || app.id || app._id || "-"
                  } | ${formatStatus(app.status)}`}
                </h4>
                <p className="application-id">
                  App ID: {app.applicationId || app.id || app._id || "-"}
                </p>
              </div>
              <span
                className={`application-status ${formatStatusClass(
                  app.status
                )}`}
              >
                {app.status || "Pending"}
              </span>
            </header>

            <div className="application-grid">
              <div>
                <p className="applications-label">Applied Amount</p>
                <p className="applications-value">
                  {formatAmount(app.amount)}
                </p>
              </div>
              <div>
                <p className="applications-label">Tenure</p>
                <p className="applications-value">
                  {app.tenure || "-"} months
                </p>
              </div>
              <div>
                <p className="applications-label">Created On</p>
                <p className="applications-value">
                  {formatDate(app.createdAt)}
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export default ActiveLoans;


{/*import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import "../../styles/ActiveLoans.css";

function ActiveLoans({ token }) {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:8080";

        const res = await fetch(`${apiUrl}/user/applications`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message || "Failed to fetch applications");
        }

        const data = await res.json();
        const sorted = Array.isArray(data)
          ? [...data].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
          : [];
        setApplications(sorted);
      } catch (err) {
        console.error(err);
        setError("Failed to fetch applications");
      } finally {
        setLoading(false);
      }
    };

    if (token) fetchApplications();
  }, [token]);

  const summary = useMemo(() => {
    const totalAmount = applications.reduce(
      (sum, app) => sum + Number(app.amount || 0),
      0
    );
    return { totalAmount, count: applications.length };
  }, [applications]);

  const formatStatusClass = (status) => {
    const value = String(status || "").toLowerCase();
    if (value.includes("approved")) return "status-approved";
    if (value.includes("rejected")) return "status-rejected";
    if (value.includes("closed")) return "status-closed";
    return "status-pending";
  };

  const formatLoanType = (loanTypeId) =>
    String(loanTypeId || "-")
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());

  const formatAmount = (value) =>
    `Rs ${Number(value || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const formatDate = (value) => {
    if (!value) return "-";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString("en-GB");
  };

  const formatStatus = (status) =>
    String(status || "-")
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());

  if (loading) return <p>Loading loan applications...</p>;
  if (error) return <p className="error-text">{error}</p>;
  if (applications.length === 0) return <p>No loan applications found.</p>;

  return (
    <div className="applications-block">
      <div className="applications-summary">
        <div>
          <p className="applications-label">Applications</p>
          <h4>{summary.count}</h4>
        </div>
        <div>
          <p className="applications-label">Total Applied Amount</p>
          <h4>{formatAmount(summary.totalAmount)}</h4>
        </div>
      </div>

      <div className="applications-list">
        {applications.map((app, index) => (
          <article
            className="application-card"
            key={app.applicationId || app.id || app._id || `loan-app-${index}`}
          >
            <header className="application-head">
              <div>
                <h4>
                  {`${formatLoanType(app.loanTypeId)} | ${app.applicationId || app.id || app._id || "-"} | ${formatStatus(app.status)}`}
                </h4>
                <p className="application-id">App ID: {app.applicationId || app.id || app._id || "-"}</p>
              </div>
              <span className={`application-status ${formatStatusClass(app.status)}`}>
                {app.status || "Pending"}
              </span>
            </header>

            <div className="application-grid">
              <div>
                <p className="applications-label">Applied Amount</p>
                <p className="applications-value">{formatAmount(app.amount)}</p>
              </div>
              <div>
                <p className="applications-label">Tenure</p>
                <p className="applications-value">{app.tenure || "-"} months</p>
              </div>
              <div>
                <p className="applications-label">Created On</p>
                <p className="applications-value">{formatDate(app.createdAt)}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export default ActiveLoans;*/}
