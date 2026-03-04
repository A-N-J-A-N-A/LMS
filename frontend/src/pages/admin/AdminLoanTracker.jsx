import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import AdminLayout from "../../Components/admin/AdminLayout";
import { getLoanRepaymentTracker } from "../../services/admin/adminLoanService";
import "../../styles/admin/applicationDetails.css";
import "../../styles/admin/loanTracker.css";

function AdminLoanTracker() {
  const PAGE_SIZE = 8;
  const { id } = useParams();
  const navigate = useNavigate();
  const role = localStorage.getItem("role");
  const [schedulePage, setSchedulePage] = useState(1);
  const [paymentPage, setPaymentPage] = useState(1);

  //  TanStack Query for fetching tracker
  const {
    data: tracker,
    isLoading: loading,
    isError,
  } = useQuery({
    queryKey: ["loan-tracker", id],
    queryFn: () => getLoanRepaymentTracker(id),
    enabled: !!id && role === "ADMIN",
    retry: false,
  });

  //  Role check (kept same logic)
  useEffect(() => {
    if (role !== "ADMIN") {
      navigate("/admin/login");
    }
  }, [role, navigate]);

  //  Handle API error same as before
  useEffect(() => {
    if (isError) {
      alert("Failed to load repayment tracker");
      navigate("/admin/active-loans");
    }
  }, [isError, navigate]);

  if (loading) {
    return (
      <AdminLayout>
        <div className="details-loading">Loading tracker...</div>
      </AdminLayout>
    );
  }

  if (!tracker) return null;

  const repaymentSchedule = tracker?.repaymentSchedule || [];
  const paymentLedger = tracker?.payments || [];

  const scheduleTotalPages = Math.max(1, Math.ceil(repaymentSchedule.length / PAGE_SIZE));
  const paymentTotalPages = Math.max(1, Math.ceil(paymentLedger.length / PAGE_SIZE));

  const scheduleStart = (schedulePage - 1) * PAGE_SIZE;
  const paymentStart = (paymentPage - 1) * PAGE_SIZE;

  const paginatedSchedule = repaymentSchedule.slice(scheduleStart, scheduleStart + PAGE_SIZE);
  const paginatedPayments = paymentLedger.slice(paymentStart, paymentStart + PAGE_SIZE);

  return (
    <AdminLayout>
      <div className="details-wrapper">
        <div className="details-header">
          <h1>Loan Tracker</h1>
          <button
            className="back-btn"
            onClick={() => navigate("/admin/active-loans")}
          >
            Back to Active Loans
          </button>
        </div>

        <div className="details-card">
          <h3 className="section-title">Loan Summary</h3>
          <table className="details-table">
            <tbody>
              <tr>
                <th>Application ID</th>
                <td>{tracker.applicationId}</td>
                <th>Customer</th>
                <td>{tracker.customerName || "-"}</td>
              </tr>
              <tr>
                <th>Loan Type</th>
                <td>{tracker.loanTypeId}</td>
                <th>Status</th>
                <td>{tracker.status}</td>
              </tr>
              <tr>
                <th>Total Paid</th>
                <td>
                  INR {Number(tracker.totalPaidAmount || 0).toLocaleString()}
                </td>
                <th>Outstanding</th>
                <td>
                  INR {Number(tracker.outstandingAmount || 0).toLocaleString()}
                </td>
              </tr>
              <tr>
                <th>Installments</th>
                <td>
                  {tracker.paidInstallments}/{tracker.totalInstallments}
                </td>
                <th>Interest Rate</th>
                <td>{tracker.interestRate || 0}%</td>
              </tr>
            </tbody>
          </table>

          <h3 className="section-title mt">Repayment Schedule</h3>
          <div className="tracker-table-wrap">
            <table className="details-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Due Date</th>
                  <th>Total EMI</th>
                  <th>Principal</th>
                  <th>Interest</th>
                  <th>Balance</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {paginatedSchedule.map((row) => (
                  <tr key={`${row.installmentNo}-${row.dueDate}`}>
                    <td>{row.installmentNo}</td>
                    <td>{row.dueDate}</td>
                    <td>
                      INR {Number(row.totalPayment || 0).toLocaleString()}
                    </td>
                    <td>
                      INR {Number(row.principalAmount || 0).toLocaleString()}
                    </td>
                    <td>
                      INR {Number(row.interestAmount || 0).toLocaleString()}
                    </td>
                    <td>
                      INR {Number(row.balanceAmount || 0).toLocaleString()}
                    </td>
                    <td>
                      <span
                        className={`status ${String(
                          row.status || ""
                        ).toLowerCase()}`}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {repaymentSchedule.length > PAGE_SIZE && (
            <div className="list-pagination">
              <button
                className="page-btn"
                onClick={() => setSchedulePage((p) => Math.max(1, p - 1))}
                disabled={schedulePage === 1}
              >
                Prev
              </button>
              <span className="page-indicator">
                Page {schedulePage} of {scheduleTotalPages}
              </span>
              <button
                className="page-btn"
                onClick={() => setSchedulePage((p) => Math.min(scheduleTotalPages, p + 1))}
                disabled={schedulePage === scheduleTotalPages}
              >
                Next
              </button>
            </div>
          )}

          <h3 className="section-title mt">Payment Ledger</h3>
          <div className="tracker-table-wrap">
            <table className="details-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {paymentLedger.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="no-data">
                      No payment records available
                    </td>
                  </tr>
                ) : (
                  paginatedPayments.map((payment) => (
                    <tr key={payment.id}>
                      <td>{payment.timestamp || "-"}</td>
                      <td>{payment.transactionType}</td>
                      <td>
                        INR {Number(payment.amount || 0).toLocaleString()}
                      </td>
                      <td>{payment.remarks || "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {paymentLedger.length > PAGE_SIZE && (
            <div className="list-pagination">
              <button
                className="page-btn"
                onClick={() => setPaymentPage((p) => Math.max(1, p - 1))}
                disabled={paymentPage === 1}
              >
                Prev
              </button>
              <span className="page-indicator">
                Page {paymentPage} of {paymentTotalPages}
              </span>
              <button
                className="page-btn"
                onClick={() => setPaymentPage((p) => Math.min(paymentTotalPages, p + 1))}
                disabled={paymentPage === paymentTotalPages}
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

export default AdminLoanTracker;


{/*}import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AdminLayout from "../../Components/admin/AdminLayout";
import { getLoanRepaymentTracker } from "../../services/admin/adminLoanService";
import "../../styles/admin/applicationDetails.css";
import "../../styles/admin/loanTracker.css";

function AdminLoanTracker() {
  const { id } = useParams();
  const navigate = useNavigate();
  const role = localStorage.getItem("role");
  const [tracker, setTracker] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchTracker = useCallback(async () => {
    try {
      const data = await getLoanRepaymentTracker(id);
      setTracker(data);
    } catch (error) {
      alert("Failed to load repayment tracker");
      navigate("/admin/active-loans");
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    if (role !== "ADMIN") {
      navigate("/admin/login");
      return;
    }
    fetchTracker();
  }, [role, navigate, fetchTracker]);

  if (loading) {
    return (
        <AdminLayout>
          <div className="details-loading">Loading tracker...</div>
        </AdminLayout>
    );
  }

  if (!tracker) return null;

  return (
      <AdminLayout>
        <div className="details-wrapper">
          <div className="details-header">
            <h1>Loan Tracker</h1>
            <button className="back-btn" onClick={() => navigate("/admin/active-loans")}>
              Back to Active Loans
            </button>
          </div>

          <div className="details-card">
            <h3 className="section-title">Loan Summary</h3>
            <table className="details-table">
              <tbody>
              <tr>
                <th>Application ID</th>
                <td>{tracker.applicationId}</td>
                <th>Customer</th>
                <td>{tracker.customerName || "-"}</td>
              </tr>
              <tr>
                <th>Loan Type</th>
                <td>{tracker.loanTypeId}</td>
                <th>Status</th>
                <td>{tracker.status}</td>
              </tr>
              <tr>
                <th>Total Paid</th>
                <td>INR {Number(tracker.totalPaidAmount || 0).toLocaleString()}</td>
                <th>Outstanding</th>
                <td>INR {Number(tracker.outstandingAmount || 0).toLocaleString()}</td>
              </tr>
              <tr>
                <th>Installments</th>
                <td>{tracker.paidInstallments}/{tracker.totalInstallments}</td>
                <th>Interest Rate</th>
                <td>{tracker.interestRate || 0}%</td>
              </tr>
              </tbody>
            </table>

            <h3 className="section-title mt">Repayment Schedule</h3>
            <div className="tracker-table-wrap">
              <table className="details-table">
                <thead>
                <tr>
                  <th>#</th>
                  <th>Due Date</th>
                  <th>Total EMI</th>
                  <th>Principal</th>
                  <th>Interest</th>
                  <th>Balance</th>
                  <th>Status</th>
                </tr>
                </thead>
                <tbody>
                {(tracker.repaymentSchedule || []).map((row) => (
                    <tr key={`${row.installmentNo}-${row.dueDate}`}>
                      <td>{row.installmentNo}</td>
                      <td>{row.dueDate}</td>
                      <td>INR {Number(row.totalPayment || 0).toLocaleString()}</td>
                      <td>INR {Number(row.principalAmount || 0).toLocaleString()}</td>
                      <td>INR {Number(row.interestAmount || 0).toLocaleString()}</td>
                      <td>INR {Number(row.balanceAmount || 0).toLocaleString()}</td>
                      <td>
                        <span className={`status ${String(row.status || "").toLowerCase()}`}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                ))}
                </tbody>
              </table>
            </div>

            <h3 className="section-title mt">Payment Ledger</h3>
            <div className="tracker-table-wrap">
              <table className="details-table">
                <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Remarks</th>
                </tr>
                </thead>
                <tbody>
                {(tracker.payments || []).length === 0 ? (
                    <tr>
                      <td colSpan="4" className="no-data">No payment records available</td>
                    </tr>
                ) : (
                    tracker.payments.map((payment) => (
                        <tr key={payment.id}>
                          <td>{payment.timestamp || "-"}</td>
                          <td>{payment.transactionType}</td>
                          <td>INR {Number(payment.amount || 0).toLocaleString()}</td>
                          <td>{payment.remarks || "-"}</td>
                        </tr>
                    ))
                )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </AdminLayout>
  );
}

export default AdminLoanTracker;*/}
