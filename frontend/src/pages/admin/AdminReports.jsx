import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import AdminLayout from "../../Components/admin/AdminLayout";
import { getAllAuditLogs } from "../../services/admin/adminAuditService";
import "../../styles/admin/reports.css";

function AdminReports() {
  const navigate = useNavigate();
  const role = localStorage.getItem("role");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const ITEMS_PER_PAGE = 8;

  const normalizeAuditLog = (log) => {
    const timestamp = log.createdAt || log.timestamp || null;
    const status =
      log.status ||
      (typeof log.success === "boolean"
        ? log.success
          ? "SUCCESS"
          : "FAILURE"
        : "-");

    return {
      ...log,
      timestamp,
      status,
      entity: log.entity || log.resourceType || "-",
      role: log.role || "-",
    };
  };

  // ✅ TanStack Query (replaces fetchLogs + useEffect)
  const {
    data,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["admin-audit-logs"],
    queryFn: getAllAuditLogs,
    enabled: role === "ADMIN",
  });

  // ✅ Role check (same behavior as before)
  useEffect(() => {
    if (role !== "ADMIN") {
      navigate("/admin/login");
    }
  }, [role, navigate]);

  // ✅ Sort logs (same logic as before)
  const logs = useMemo(() => {
    const raw = Array.isArray(data) ? data : [];
    const normalized = raw.map(normalizeAuditLog);
    return normalized.sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );
  }, [data]);

  const formatTimestamp = (value) => {
    if (!value) return "-";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "-";
    return parsed.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  // ✅ Last 1 hour logs
  const lastOneHourLogs = useMemo(() => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return logs.filter((log) => {
      const logTime = new Date(log.timestamp);
      return logTime >= oneHourAgo;
    });
  }, [logs]);

  // ✅ Summary counts (unchanged)
  const summaryCounts = useMemo(() => {
    const total = lastOneHourLogs.length;

    const success = lastOneHourLogs.filter(
      (log) => (log.status || "").toUpperCase() === "SUCCESS"
    ).length;

    const failure = lastOneHourLogs.filter(
      (log) => (log.status || "").toUpperCase() === "FAILURE"
    ).length;

    return { total, success, failure };
  }, [lastOneHourLogs]);

  // ✅ Filtering (unchanged logic)
  const filteredLogs = useMemo(() => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    return logs.filter((log) => {
      const logTime = new Date(log.timestamp);
      const isLastOneHour = logTime >= oneHourAgo;

      const matchesSearch =
        (log.userId || "").toLowerCase().includes(search.toLowerCase()) ||
        (log.apiPath || "").toLowerCase().includes(search.toLowerCase()) ||
        (log.entity || "").toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        !statusFilter ||
        (log.status || "").toUpperCase() === statusFilter.toUpperCase();

      const matchesAction =
        !actionFilter ||
        (log.action || "").toLowerCase() === actionFilter.toLowerCase();

      return (
        isLastOneHour &&
        matchesSearch &&
        matchesStatus &&
        matchesAction
      );
    });
  }, [logs, search, statusFilter, actionFilter]);

  const actionOptions = useMemo(() => {
    return Array.from(
      new Set(logs.map((log) => log.action).filter(Boolean))
    ).sort();
  }, [logs]);

  const handleCardClick = (type) => {
    if (type === "SUCCESS") {
      setStatusFilter("SUCCESS");
    } else if (type === "FAILURE") {
      setStatusFilter("FAILURE");
    } else {
      setStatusFilter("");
    }
  };

  const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE);

  const pageData = filteredLogs.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, actionFilter]);

  if (isError) {
    return (
      <AdminLayout>
        <div className="reports-page">
          <div className="no-data">Failed to load audit logs</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="reports-page">
        <div className="reports-header">
          <h1>Audit Reports</h1>
          <p>Track admin and user actions across the platform.</p>
        </div>

        <div className="dashboard-overview">
          <div className="dashboard-top">
            <div>
              <h1>Audit Overview</h1>
              <p>Monitor success and failure logs (Last 1 Hour)</p>
            </div>
          </div>

          <div className="dashboard-cards">
            <div
              className="overview-card"
              onClick={() => handleCardClick("ALL")}
            >
              <h2>{summaryCounts.total}</h2>
              <p>Total Logs</p>
            </div>

            <div
              className="overview-card"
              onClick={() => handleCardClick("SUCCESS")}
            >
              <h2>{summaryCounts.success}</h2>
              <p>Success</p>
            </div>

            <div
              className="overview-card"
              onClick={() => handleCardClick("FAILURE")}
            >
              <h2>{summaryCounts.failure}</h2>
              <p>Failure</p>
            </div>
          </div>
        </div>

        <div className="reports-controls">
          <input
            type="text"
            placeholder="Search by user, api path, or entity..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="FAILURE">FAILURE</option>
          </select>

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          >
            <option value="">All Actions</option>
            {actionOptions.map((action) => (
              <option key={action} value={action}>
                {action}
              </option>
            ))}
          </select>
        </div>

        <div className="reports-table-card">
          <table className="reports-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User ID</th>
                <th>Role</th>
                <th>Action</th>
                <th>Method</th>
                <th>API Path</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="7" className="no-data">
                    Loading audit logs...
                  </td>
                </tr>
              ) : pageData.length > 0 ? (
                pageData.map((log, index) => (
                  <tr key={log.id || `${log.userId}-${index}`}>
                    <td>{formatTimestamp(log.timestamp)}</td>
                    <td>{log.userId || "-"}</td>
                    <td>{log.role || "-"}</td>
                    <td>{log.action || "-"}</td>
                    <td>{log.httpMethod || "-"}</td>
                    <td>{log.apiPath || "-"}</td>
                    <td>
                      <span
                        className={`status-badge ${
                          (log.status || "").toLowerCase() === "success"
                            ? "ok"
                            : "fail"
                        }`}
                      >
                        {log.status || "-"}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="no-data">
                    No audit logs found
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="reports-pagination">
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Prev
              </button>
              <span>
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
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

export default AdminReports;


{/*}import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../Components/admin/AdminLayout";
import { getAllAuditLogs } from "../../services/admin/adminAuditService";
import "../../styles/admin/reports.css";

function AdminReports() {
  const navigate = useNavigate();
  const role = localStorage.getItem("role");

  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const ITEMS_PER_PAGE = 8;
  const normalizeAuditLog = (log) => {
    const timestamp = log.createdAt || log.timestamp || null;
    const status =
      log.status ||
      (typeof log.success === "boolean"
        ? log.success
          ? "SUCCESS"
          : "FAILURE"
        : "-");

    return {
      ...log,
      timestamp,
      status,
      entity: log.entity || log.resourceType || "-",
      role: log.role || "-",
    };
  };

  const formatTimestamp = (value) => {
    if (!value) return "-";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "-";
    return parsed.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  useEffect(() => {
    if (role !== "ADMIN") {
      navigate("/admin/login");
      return;
    }
    const fetchLogs = async () => {
      try {
        const data = await getAllAuditLogs();
        const normalized = (data || []).map(normalizeAuditLog);
        const sorted = normalized.sort(
          (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
        );
        setLogs(sorted);
      } catch (error) {
        alert("Failed to load audit logs");
      }
    };

    fetchLogs();
  }, [role, navigate]);

  const filteredLogs = useMemo(() => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    return logs.filter((log) => {
      const logTime = new Date(log.timestamp);
      const isLastOneHour = logTime >= oneHourAgo;

      const matchesSearch =
        (log.userId || "").toLowerCase().includes(search.toLowerCase()) ||
        (log.apiPath || "").toLowerCase().includes(search.toLowerCase()) ||
        (log.entity || "").toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        !statusFilter ||
        (log.status || "").toUpperCase() === statusFilter.toUpperCase();

      const matchesAction =
        !actionFilter ||
        (log.action || "").toLowerCase() === actionFilter.toLowerCase();

      //always restrict to last 1 hour
      return (
        isLastOneHour &&
        matchesSearch &&
        matchesStatus &&
        matchesAction
      );
    });
  }, [logs, search, statusFilter, actionFilter]);

  const actionOptions = useMemo(() => {
    return Array.from(
      new Set(logs.map((log) => log.action).filter(Boolean))
    ).sort();
  }, [logs]);

//new
  // Logs from last 1 hour
  const handleCardClick = (type) => {
    if (type === "SUCCESS") {
      setStatusFilter("SUCCESS");
    } else if (type === "FAILURE") {
      setStatusFilter("FAILURE");
    } else {
      setStatusFilter("");
    }
  };


  const lastOneHourLogs = useMemo(() => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    return logs.filter((log) => {
      const logTime = new Date(log.timestamp);
      return logTime >= oneHourAgo;
    });
  }, [logs]);

  // Count calculation
  const summaryCounts = useMemo(() => {
    const total = lastOneHourLogs.length;

    const success = lastOneHourLogs.filter(
      (log) => (log.status || "").toUpperCase() === "SUCCESS"
    ).length;

    const failure = lastOneHourLogs.filter(
      (log) => (log.status || "").toUpperCase() === "FAILURE"
    ).length;

    return { total, success, failure };
  }, [lastOneHourLogs]);

//end

  const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE);
  const pageData = filteredLogs.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, actionFilter]);

  return (
    <AdminLayout>
      <div className="reports-page">
        <div className="reports-header">
          <h1>Audit Reports</h1>
          <p>Track admin and user actions across the platform.</p>
        </div>

      <div className="dashboard-overview">

        <div className="dashboard-top">
          <div>
            <h1>Audit Overview</h1>
            <p>Monitor success and failure logs (Last 1 Hour)</p>
          </div>
        </div>

        <div className="dashboard-cards">
          <div
            className="overview-card"
            onClick={() => handleCardClick("ALL")}
          >
            <h2>{summaryCounts.total}</h2>
            <p>Total Logs</p>
          </div>

          <div
            className="overview-card"
            onClick={() => handleCardClick("SUCCESS")}
          >
            <h2>{summaryCounts.success}</h2>
            <p>Success</p>
          </div>

          <div
            className="overview-card"
            onClick={() => handleCardClick("FAILURE")}
          >
            <h2>{summaryCounts.failure}</h2>
            <p>Failure</p>
          </div>
        </div>

      </div>


        <div className="reports-controls">
          <input
            type="text"
            placeholder="Search by user, api path, or entity..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="FAILURE">FAILURE</option>
          </select>

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          >
            <option value="">All Actions</option>
            {actionOptions.map((action) => (
              <option key={action} value={action}>
                {action}
              </option>
            ))}
          </select>
        </div>

        <div className="reports-table-card">
          <table className="reports-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User ID</th>
                <th>Entity</th>
                <th>Action</th>
                <th>Method</th>
                <th>API Path</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {pageData.length > 0 ? (
                pageData.map((log, index) => (
                  <tr key={log.id || `${log.userId}-${index}`}>
                    <td>
                      {formatTimestamp(log.timestamp)}
                    </td>
                    <td>{log.userId || "-"}</td>
                    <td>{log.entity || "-"}</td>
                    <td>{log.action || "-"}</td>
                    <td>{log.httpMethod || "-"}</td>
                    <td>{log.apiPath || "-"}</td>
                    <td>
                      <span
                        className={`status-badge ${
                          (log.status || "").toLowerCase() === "success"
                            ? "ok"
                            : "fail"
                        }`}
                      >
                        {log.status || "-"}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="no-data">
                    No audit logs found
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="reports-pagination">
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Prev
              </button>
              <span>
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
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

export default AdminReports;*/}
