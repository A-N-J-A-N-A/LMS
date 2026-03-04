import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import AdminLayout from "../../Components/admin/AdminLayout";
import { getProfitabilitySummary } from "../../services/admin/adminDashboardService";
import "../../styles/admin/profitability.css";

const PIE_COLORS = [
  "#1f4f8a",
  "#2d78c4",
  "#34a0a4",
  "#4caf50",
  "#e6a700",
  "#d97b00",
  "#d64545",
  "#7b61ff",
];

const defaultSummary = {
  totalInterestProfit: 0,
  interestPaymentCount: 0,
  byLoanType: [],
  disbursedLoanCount: 0,
  closedLoanCount: 0,
  totalDisbursedAmount: 0,
  totalPaidBackAmount: 0,
  mostProfitableLoanType: "N/A",
  mostProfitableLoanTypeProfit: 0,
};

function AdminProfitability() {
  const navigate = useNavigate();
  const role = localStorage.getItem("role");

  const [displayDisbursedAmount, setDisplayDisbursedAmount] = useState(0);
  const [displayPaidBackAmount, setDisplayPaidBackAmount] = useState(0);

  // ✅ TanStack Query
  const {
    data,
    isLoading: loading,
    isError,
  } = useQuery({
    queryKey: ["admin-profitability-summary"],
    queryFn: getProfitabilitySummary,
    enabled: role === "ADMIN",
  });

  // ✅ Role check (unchanged logic)
  useEffect(() => {
    if (role !== "ADMIN") {
      navigate("/admin/login");
    }
  }, [role, navigate]);


  const summary = useMemo(() => {
    const s = data || {};
    return {
      totalInterestProfit: Number(s?.totalInterestProfit || 0),
      interestPaymentCount: Number(s?.interestPaymentCount || 0),
      byLoanType: Array.isArray(s?.byLoanType) ? s.byLoanType : [],
      disbursedLoanCount: Number(s?.disbursedLoanCount || 0),
      closedLoanCount: Number(s?.closedLoanCount || 0),
      totalDisbursedAmount: Number(s?.totalDisbursedAmount || 0),
      totalPaidBackAmount: Number(s?.totalPaidBackAmount || 0),
      mostProfitableLoanType: s?.mostProfitableLoanType || "N/A",
      mostProfitableLoanTypeProfit: Number(s?.mostProfitableLoanTypeProfit || 0),
    };
  }, [data]);

  // ✅ Animation preserved (unchanged)
  useEffect(() => {
    let frameId = null;
    const duration = 900;
    const start = performance.now();
    const endDisbursed = summary.totalDisbursedAmount;
    const endPaid = summary.totalPaidBackAmount;

    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayDisbursedAmount(endDisbursed * eased);
      setDisplayPaidBackAmount(endPaid * eased);
      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => {
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [summary.totalDisbursedAmount, summary.totalPaidBackAmount]);

  // ✅ Pie calculation (UNCHANGED)
  const pieData = useMemo(() => {
    const total = summary.byLoanType.reduce(
      (acc, row) => acc + Number(row?.interestProfit || 0),
      0
    );

    if (total <= 0) return { gradient: "#dbe5f0", rows: [], hasData: false };

    let running = 0;

    const rows = summary.byLoanType.map((row, index) => {
      const amount = Number(row?.interestProfit || 0);
      const share = amount > 0 ? (amount / total) * 100 : 0;
      const start = running;
      const end = running + share;
      running = end;

      return {
        loanTypeId: row?.loanTypeId || "UNKNOWN",
        interestProfit: amount,
        paymentCount: Number(row?.paymentCount || 0),
        share,
        color: PIE_COLORS[index % PIE_COLORS.length],
        start,
        end,
      };
    });

    const gradient = rows
      .map((row) => `${row.color} ${row.start}% ${row.end}%`)
      .join(", ");

    return { gradient, rows, hasData: true };
  }, [summary.byLoanType]);

  if (isError) {
    return (
      <AdminLayout>
        <div className="profitability-page">
          <div className="profitability-empty">
            Failed to load profitability data
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="profitability-page">
        <div className="profitability-header">
          <h1>Profitability</h1>
          <p>Interest earnings across all loan types</p>
        </div>

        <div className="profitability-top-cards">
          <div className="profit-card">
            <h3>Total Interest Profit</h3>
            <div className="profit-value">
              INR{" "}
              {summary.totalInterestProfit.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
          </div>

          <div className="profit-card">
            <h3>Loans Disbursed / Closed</h3>
            <div className="profit-value compact">
              {summary.disbursedLoanCount} / {summary.closedLoanCount}
            </div>
          </div>

          <div className="profit-card">
            <h3>Total Disbursed Amount</h3>
            <div className="profit-value">
              INR{" "}
              {displayDisbursedAmount.toLocaleString("en-IN", {
                maximumFractionDigits: 0,
              })}
            </div>
          </div>

          <div className="profit-card">
            <h3>Total Paid Back Amount</h3>
            <div className="profit-value">
              INR{" "}
              {displayPaidBackAmount.toLocaleString("en-IN", {
                maximumFractionDigits: 0,
              })}
            </div>
          </div>
        </div>

        <div className="profitability-main-card">
          <h2>Loan Type Contribution</h2>
          <div className="profitability-chart-section">
            <div
              className="profitability-pie"
              style={{ background: `conic-gradient(${pieData.gradient})` }}
            />

            <div className="profitability-legend">
              {loading && (
                <div className="profitability-empty">
                  Loading profitability...
                </div>
              )}

              {!loading && !pieData.hasData && (
                <div className="profitability-empty">
                  No interest data available yet
                </div>
              )}

              {!loading &&
                pieData.rows.map((row) => (
                  <div key={row.loanTypeId} className="legend-row">
                    <span
                      className="legend-dot"
                      style={{ backgroundColor: row.color }}
                    />
                    <span className="legend-name">{row.loanTypeId}</span>
                    <span className="legend-share">
                      {row.share.toFixed(1)}%
                    </span>
                    <span className="legend-amount">
                      INR {row.interestProfit.toLocaleString("en-IN")}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>

        <div className="profitability-main-card">
          <h2>Most Profitable Loan Type</h2>
          <div className="top-loan-type">
            <span className="top-loan-name">
              {summary.mostProfitableLoanType}
            </span>
            <span className="top-loan-profit">
              INR{" "}
              {summary.mostProfitableLoanTypeProfit.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

export default AdminProfitability;


{/*import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../Components/admin/AdminLayout";
import { getProfitabilitySummary } from "../../services/admin/adminDashboardService";
import "../../styles/admin/profitability.css";

const PIE_COLORS = [
  "#1f4f8a",
  "#2d78c4",
  "#34a0a4",
  "#4caf50",
  "#e6a700",
  "#d97b00",
  "#d64545",
  "#7b61ff",
];

function AdminProfitability() {
  const navigate = useNavigate();
  const role = localStorage.getItem("role");
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    totalInterestProfit: 0,
    interestPaymentCount: 0,
    byLoanType: [],
    disbursedLoanCount: 0,
    closedLoanCount: 0,
    totalDisbursedAmount: 0,
    totalPaidBackAmount: 0,
    mostProfitableLoanType: "N/A",
    mostProfitableLoanTypeProfit: 0,
  });
  const [displayDisbursedAmount, setDisplayDisbursedAmount] = useState(0);
  const [displayPaidBackAmount, setDisplayPaidBackAmount] = useState(0);

  useEffect(() => {
    if (role !== "ADMIN") {
      navigate("/admin/login");
      return;
    }

    let mounted = true;
    const loadProfitability = async () => {
      try {
        const data = await getProfitabilitySummary();
        if (!mounted) return;
        setSummary({
          totalInterestProfit: Number(data?.totalInterestProfit || 0),
          interestPaymentCount: Number(data?.interestPaymentCount || 0),
          byLoanType: Array.isArray(data?.byLoanType) ? data.byLoanType : [],
          disbursedLoanCount: Number(data?.disbursedLoanCount || 0),
          closedLoanCount: Number(data?.closedLoanCount || 0),
          totalDisbursedAmount: Number(data?.totalDisbursedAmount || 0),
          totalPaidBackAmount: Number(data?.totalPaidBackAmount || 0),
          mostProfitableLoanType: data?.mostProfitableLoanType || "N/A",
          mostProfitableLoanTypeProfit: Number(data?.mostProfitableLoanTypeProfit || 0),
        });
      } catch (error) {
        if (!mounted) return;
        setSummary({
          totalInterestProfit: 0,
          interestPaymentCount: 0,
          byLoanType: [],
          disbursedLoanCount: 0,
          closedLoanCount: 0,
          totalDisbursedAmount: 0,
          totalPaidBackAmount: 0,
          mostProfitableLoanType: "N/A",
          mostProfitableLoanTypeProfit: 0,
        });
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadProfitability();
    return () => {
      mounted = false;
    };
  }, [role, navigate]);

  useEffect(() => {
    let frameId = null;
    const duration = 900;
    const start = performance.now();
    const startDisbursed = 0;
    const startPaid = 0;
    const endDisbursed = summary.totalDisbursedAmount;
    const endPaid = summary.totalPaidBackAmount;

    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayDisbursedAmount(startDisbursed + (endDisbursed - startDisbursed) * eased);
      setDisplayPaidBackAmount(startPaid + (endPaid - startPaid) * eased);
      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => {
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [summary.totalDisbursedAmount, summary.totalPaidBackAmount]);

  const pieData = useMemo(() => {
    const total = summary.byLoanType.reduce(
      (acc, row) => acc + Number(row?.interestProfit || 0),
      0
    );
    if (total <= 0) return { gradient: "#dbe5f0", rows: [], hasData: false };

    let running = 0;
    const rows = summary.byLoanType.map((row, index) => {
      const amount = Number(row?.interestProfit || 0);
      const share = amount > 0 ? (amount / total) * 100 : 0;
      const start = running;
      const end = running + share;
      running = end;

      return {
        loanTypeId: row?.loanTypeId || "UNKNOWN",
        interestProfit: amount,
        paymentCount: Number(row?.paymentCount || 0),
        share,
        color: PIE_COLORS[index % PIE_COLORS.length],
        start,
        end,
      };
    });

    const gradient = rows
      .map((row) => `${row.color} ${row.start}% ${row.end}%`)
      .join(", ");

    return { gradient, rows, hasData: true };
  }, [summary.byLoanType]);

  return (
    <AdminLayout>
      <div className="profitability-page">
        <div className="profitability-header">
          <h1>Profitability</h1>
          <p>Interest earnings across all loan types</p>
        </div>

        <div className="profitability-top-cards">
          <div className="profit-card">
            <h3>Total Interest Profit</h3>
            <div className="profit-value">
              INR{" "}
              {summary.totalInterestProfit.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
          </div>
          <div className="profit-card">
            <h3>Loans Disbursed / Closed</h3>
            <div className="profit-value compact">
              {summary.disbursedLoanCount} / {summary.closedLoanCount}
            </div>
          </div>
          <div className="profit-card">
            <h3>Total Disbursed Amount</h3>
            <div className="profit-value">
              INR{" "}
              {displayDisbursedAmount.toLocaleString("en-IN", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </div>
          </div>
          <div className="profit-card">
            <h3>Total Paid Back Amount</h3>
            <div className="profit-value">
              INR{" "}
              {displayPaidBackAmount.toLocaleString("en-IN", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </div>
          </div>
        </div>

        <div className="profitability-main-card">
          <h2>Loan Type Contribution</h2>
          <div className="profitability-chart-section">
            <div
              className="profitability-pie"
              style={{ background: `conic-gradient(${pieData.gradient})` }}
              aria-label="Profitability by loan type pie chart"
            />

            <div className="profitability-legend">
              {loading && <div className="profitability-empty">Loading profitability...</div>}
              {!loading && !pieData.hasData && (
                <div className="profitability-empty">No interest data available yet</div>
              )}
              {!loading && pieData.rows.map((row) => (
                <div key={row.loanTypeId} className="legend-row">
                  <span
                    className="legend-dot"
                    style={{ backgroundColor: row.color }}
                  />
                  <span className="legend-name">{row.loanTypeId}</span>
                  <span className="legend-share">
                    {row.share.toFixed(1)}%
                  </span>
                  <span className="legend-amount">
                    INR {row.interestProfit.toLocaleString("en-IN")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="profitability-main-card">
          <h2>Most Profitable Loan Type</h2>
          <div className="top-loan-type">
            <span className="top-loan-name">{summary.mostProfitableLoanType}</span>
            <span className="top-loan-profit">
              INR{" "}
              {summary.mostProfitableLoanTypeProfit.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

export default AdminProfitability;*/}
