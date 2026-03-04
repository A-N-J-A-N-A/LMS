import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import AdminLayout from "../../Components/admin/AdminLayout";
import { getActiveLoans } from "../../services/admin/adminLoanService";
import "../../styles/admin/activeLoans.css";

function AdminActiveLoans() {
  const role = localStorage.getItem("role");
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 6;

  // 🔐 Role protection (same behavior)
  useEffect(() => {
    if (role !== "ADMIN") {
      navigate("/admin/login");
    }
  }, [role, navigate]);

  // ✅ TanStack Query replaces useEffect + useState + useCallback
  const {
    data: loans = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["adminActiveLoans"],
    queryFn: getActiveLoans,
    enabled: role === "ADMIN", // only fetch if admin
  });

  const normalize = (value) =>
    String(value || "")
      .toLowerCase()
      .replace(/\s+/g, "");

  const filtered = useMemo(() => {
    const q = normalize(search);
    if (!q) return loans;

    return loans.filter((loan) => {
      return (
        normalize(loan.applicationId).includes(q) ||
        normalize(loan.customerName).includes(q) ||
        normalize(loan.loanTypeId).includes(q) ||
        normalize(loan.status).includes(q)
      );
    });
  }, [loans, search]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedLoans = useMemo(() => {
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

  return (
    <AdminLayout>
      <div className="applications-page">
        <h1 className="page-title">Active Loans</h1>

        <div className="controls">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer, application ID or loan type..."
          />
        </div>

        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>Application ID</th>
                <th>Customer</th>
                <th>Loan Type</th>
                <th>Disbursed (INR)</th>
                <th>Paid EMIs</th>
                <th>Outstanding (INR)</th>
                <th>Next Due Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="8" className="no-data">
                    Loading active loans...
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan="8" className="no-data">
                    Failed to load active loans
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="8" className="no-data">
                    No active loans found
                  </td>
                </tr>
              ) : (
                paginatedLoans.map((loan) => (
                  <tr key={loan.applicationId}>
                    <td>{loan.applicationId}</td>
                    <td>{loan.customerName || "-"}</td>
                    <td>{loan.loanTypeId}</td>
                    <td>
                      {Number(
                        loan.disbursedAmount || 0
                      ).toLocaleString()}
                    </td>
                    <td>
                      {loan.paidInstallments}/
                      {loan.totalInstallments}
                    </td>
                    <td>
                      {Number(
                        loan.outstandingAmount || 0
                      ).toLocaleString()}
                    </td>
                    <td>{loan.nextDueDate || "-"}</td>
                    <td>
                      <button
                        type="button"
                        className="view-btn"
                        onClick={() =>
                          navigate(
                            `/admin/active-loans/${loan.applicationId}`
                          )
                        }
                      >
                        Track
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {!isLoading && !isError && filtered.length > 0 && (
            <div className="pagination">
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

export default AdminActiveLoans;


{/*import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../Components/admin/AdminLayout";
import { getActiveLoans } from "../../services/admin/adminLoanService";
import "../../styles/admin/activeLoans.css";

function AdminActiveLoans() {
  const role = localStorage.getItem("role");
  const navigate = useNavigate();
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 6;

  const fetchActiveLoans = useCallback(async () => {
    try {
      const data = await getActiveLoans();
      setLoans(Array.isArray(data) ? data : []);
    } catch (error) {
      alert("Failed to load active loans");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (role !== "ADMIN") {
      navigate("/admin/login");
      return;
    }
    fetchActiveLoans();
  }, [role, navigate, fetchActiveLoans]);

  const normalize = (value) =>
      String(value || "")
          .toLowerCase()
          .replace(/\s+/g, "");

  const filtered = loans.filter((loan) => {
    const q = normalize(search);
    if (!q) return true;

    return (
        normalize(loan.applicationId).includes(q) ||
        normalize(loan.customerName).includes(q) ||
        normalize(loan.loanTypeId).includes(q) ||
        normalize(loan.status).includes(q)
    );
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentData = filtered.slice(startIndex, startIndex + itemsPerPage);

  return (
      <AdminLayout>
        <div className="applications-page">
          <h1 className="page-title">Active Loans</h1>
          <div className="controls">
            <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search by customer, application ID or loan type..."
            />
          </div>

          <div className="table-card">
            <table>
              <thead>
              <tr>
                <th>Application ID</th>
                <th>Customer</th>
                <th>Loan Type</th>
                <th>Disbursed (INR)</th>
                <th>Paid EMIs</th>
                <th>Outstanding (INR)</th>
                <th>Next Due Date</th>
                <th>Action</th>
              </tr>
              </thead>
              <tbody>
              {loading ? (
                  <tr>
                    <td colSpan="8" className="no-data">Loading active loans...</td>
                  </tr>
              ) : currentData.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="no-data">No active loans found</td>
                  </tr>
              ) : (
                  currentData.map((loan) => (
                      <tr key={loan.applicationId}>
                        <td>{loan.applicationId}</td>
                        <td>{loan.customerName || "-"}</td>
                        <td>{loan.loanTypeId}</td>
                        <td>{Number(loan.disbursedAmount || 0).toLocaleString()}</td>
                        <td>{loan.paidInstallments}/{loan.totalInstallments}</td>
                        <td>{Number(loan.outstandingAmount || 0).toLocaleString()}</td>
                        <td>{loan.nextDueDate || "-"}</td>
                        <td>
                          <button
                              type="button"
                              className="view-btn"
                              onClick={() => navigate(`/admin/active-loans/${loan.applicationId}`)}
                          >
                            Track
                          </button>
                        </td>
                      </tr>
                  ))
              )}
              </tbody>
            </table>

            <div className="pagination">
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
          </div>
        </div>
      </AdminLayout>
  );
}

export default AdminActiveLoans;*/}
