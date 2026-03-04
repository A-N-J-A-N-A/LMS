import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../Components/admin/AdminLayout";
import { getAllApplications } from "../../services/admin/adminLoanService";
import "../../styles/admin/applications.css";

// Read saved admin settings from localStorage
function readAdminSettings() {
  try {
    return JSON.parse(localStorage.getItem("adminSettings") || "{}");
  } catch {
    return {};
  }
}

function AdminApplications() {
  const navigate = useNavigate();
  const role = localStorage.getItem("role");
  const savedSettings = readAdminSettings();

  const [applications, setApplications] = useState([]);
  const [statusFilter, setStatusFilter] = useState(savedSettings.defaultStatusFilter || "");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 6;

  // Fetch applications with optional status filter
  const fetchApplications = useCallback(async () => {
    try {
      const data = await getAllApplications(statusFilter);
      setApplications(data || []);
    } catch (error) {
      alert("Failed to load applications");
    }
  }, [statusFilter]);

  useEffect(() => {
    if (role !== "ADMIN") {
      navigate("/admin/login");
      return;
    }
    fetchApplications();
  }, [role, navigate, fetchApplications]);

  // Normalize text for search
  const normalize = (value) => String(value || "").toLowerCase().replace(/\s+/g, "");

  // Filter applications by search query
  const filteredApps = applications.filter((app) => {
    const q = normalize(search);
    if (!q) return true;

    return (
      normalize(app.applicationId).includes(q) ||
      normalize(app.customerName).includes(q) ||
      normalize(app.kycStatus).includes(q) ||
      normalize(app.loanTypeId).includes(q) ||
      normalize(app.amount).includes(q) ||
      normalize(app.status).includes(q)
    );
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredApps.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentData = filteredApps.slice(startIndex, startIndex + itemsPerPage);

  return (
    <AdminLayout>
      <div className="applications-page">
        <h1 className="page-title">Loan Applications</h1>

        <div className="controls">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">All</option>
            <option value="APPLIED">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>

          <input
            type="text"
            placeholder="Search by Application ID or Customer..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>Application ID</th>
                <th>Customer Name</th>
                <th>KYC Status</th>
                <th>Loan Type</th>
                <th>Amount (INR)</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {currentData.map((app) => (
                <tr key={app.applicationId}>
                  <td>{app.applicationId}</td>
                  <td>{app.customerName || "-"}</td>
                  <td>
                    <span className={`status ${(app.kycStatus || "UNKNOWN").toLowerCase()}`}>
                      {app.kycStatus || "UNKNOWN"}
                    </span>
                  </td>
                  <td>{app.loanTypeId}</td>
                  <td>INR {Number(app.amount).toLocaleString()}</td>
                  <td>
                    <span className={`status ${app.status.toLowerCase()}`}>{app.status}</span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="view-btn"
                      onClick={() => navigate(`/admin/applications/${app.applicationId}`)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}

              {currentData.length === 0 && (
                <tr>
                  <td colSpan="7" className="no-data">
                    No applications found
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="pagination">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
            >
              Prev
            </button>
            <span>
              Page {currentPage} of {totalPages || 1}
            </span>
            <button
              disabled={currentPage === totalPages || totalPages === 0}
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

export default AdminApplications;


{/*import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../Components/admin/AdminLayout";
import { getAllApplications } from "../../services/admin/adminLoanService";
import "../../styles/admin/applications.css";

function readAdminSettings() {
  try {
    return JSON.parse(localStorage.getItem("adminSettings") || "{}");
  } catch {
    return {};
  }
}

function AdminApplications() {
  const navigate = useNavigate();
  const role = localStorage.getItem("role");
  const savedSettings = readAdminSettings();

  const [applications, setApplications] = useState([]);
  const [statusFilter, setStatusFilter] = useState(
      savedSettings.defaultStatusFilter || ""
  );
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 6;

  const fetchApplications = useCallback(async () => {
    try {
      const data = await getAllApplications(statusFilter);
      setApplications(data || []);
    } catch (error) {
      alert("Failed to load applications");
    }
  }, [statusFilter]);

  useEffect(() => {
    if (role !== "ADMIN") {
      navigate("/admin/login");
      return;
    }
    fetchApplications();
  }, [role, navigate, fetchApplications]);

  const normalize = (value) =>
      String(value || "")
          .toLowerCase()
          .replace(/\s+/g, "");

  const filteredApps = applications.filter((app) => {
    const q = normalize(search);
    if (!q) return true;

    const applicationId = normalize(app.applicationId);
    const customerName = normalize(app.customerName);
    const kycStatus = normalize(app.kycStatus);
    const loanType = normalize(app.loanTypeId);
    const amount = normalize(app.amount);
    const status = normalize(app.status);

    return (
        applicationId.includes(q) ||
        customerName.includes(q) ||
        kycStatus.includes(q) ||
        loanType.includes(q) ||
        amount.includes(q) ||
        status.includes(q)
    );
  });

  const totalPages = Math.ceil(filteredApps.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentData = filteredApps.slice(startIndex, startIndex + itemsPerPage);

  return (
      <AdminLayout>
        <div className="applications-page">
          <h1 className="page-title">Loan Applications</h1>

          <div className="controls">
            <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
            >
              <option value="">All</option>
              <option value="APPLIED">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>

            <input
                type="text"
                placeholder="Search by Application ID or Customer..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
            />
          </div>

          <div className="table-card">
            <table>
              <thead>
              <tr>
                <th>Application ID</th>
                <th>Customer Name</th>
                <th>KYC Status</th>
                <th>Loan Type</th>
                <th>Amount (INR)</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
              </thead>

              <tbody>
              {currentData.map((app) => (
                  <tr
                      key={app.applicationId}
                  >
                    <td>{app.applicationId}</td>
                    <td>{app.customerName || "-"}</td>
                    <td>
                      <span className={`status ${(app.kycStatus || "UNKNOWN").toLowerCase()}`}>
                        {app.kycStatus || "UNKNOWN"}
                      </span>
                    </td>
                    <td>{app.loanTypeId}</td>
                    <td>INR {Number(app.amount).toLocaleString()}</td>
                    <td>
                    <span className={`status ${app.status.toLowerCase()}`}>
                      {app.status}
                    </span>
                    </td>
                    <td>
                      <button
                          type="button"
                          className="view-btn"
                          onClick={() => navigate(`/admin/applications/${app.applicationId}`)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
              ))}

              {currentData.length === 0 && (
                  <tr>
                    <td colSpan="7" className="no-data">
                      No applications found
                    </td>
                  </tr>
              )}
              </tbody>
            </table>

            <div className="pagination">
              <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
              >
                Prev
              </button>
              <span>
              Page {currentPage} of {totalPages || 1}
            </span>
              <button
                  disabled={currentPage === totalPages || totalPages === 0}
                  onClick={() => setCurrentPage(currentPage + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </AdminLayout>
  );
}

export default AdminApplications;*/}
