import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../Components/admin/AdminLayout";
import { getDashboardStats } from "../../services/admin/adminDashboardService";
import { getAllApplications } from "../../services/admin/adminLoanService";
import "../../styles/admin/dashboard.css";

function AdminDashboard() {
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);

  // Get user info from localStorage
  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  })();

  const adminName = user.fullName || user.name || "Admin";
  const adminInitial = (adminName || "A").charAt(0).toUpperCase();

  const [stats, setStats] = useState({
    total: 0,
    approved: 0,
    rejected: 0,
    pending: 0,
    totalLoansIssued: 0,
    activeLoans: 0,
    closedLoans: 0,
    defaultedNpaLoans: 0,
    totalCustomers: 0,
    totalAmountDisbursed: 0,
    totalOutstandingPrincipal: 0,
    emiCollectedToday: 0,
    emiCollectedThisMonth: 0,
    overdueAmount: 0,
    prepaymentAmount: 0,
    excessPaymentAmount: 0,
    pendingApplications: 0,
    approvedApplications: 0,
    rejectedApplications: 0,
    approvedButNotDisbursedLoans: 0,
    upcomingEmisNext7Days: 0,
    upcomingEmisNext30Days: 0,
    onTimePayments: 0,
    latePayments: 0,
    missedEmis: 0,
    penaltyLateFeeGeneratedAmount: 0,
    penaltyLateFeeGeneratedCount: 0,
  });

  const [allApplications, setAllApplications] = useState([]);
  const [recentApps, setRecentApps] = useState([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const statsData = await getDashboardStats();
      const applications = await getAllApplications();
      const appList = Array.isArray(applications) ? applications : [];

      setStats({
        total: statsData?.totalApplications || 0,
        approved: statsData?.approved || 0,
        rejected: statsData?.rejected || 0,
        pending: statsData?.pending || 0,
        totalLoansIssued: statsData?.totalLoansIssued || 0,
        activeLoans: statsData?.activeLoans || 0,
        closedLoans: statsData?.closedLoans || 0,
        defaultedNpaLoans: statsData?.defaultedNpaLoans || 0,
        totalCustomers: statsData?.totalCustomers || 0,
        totalAmountDisbursed: Number(statsData?.totalAmountDisbursed || 0),
        totalOutstandingPrincipal: Number(statsData?.totalOutstandingPrincipal || 0),
        emiCollectedToday: Number(statsData?.emiCollectedToday || 0),
        emiCollectedThisMonth: Number(statsData?.emiCollectedThisMonth || 0),
        overdueAmount: Number(statsData?.overdueAmount || 0),
        prepaymentAmount: Number(statsData?.prepaymentAmount || 0),
        excessPaymentAmount: Number(statsData?.excessPaymentAmount || 0),
        pendingApplications: statsData?.pendingApplications || 0,
        approvedApplications: statsData?.approvedApplications || 0,
        rejectedApplications: statsData?.rejectedApplications || 0,
        approvedButNotDisbursedLoans: statsData?.approvedButNotDisbursedLoans || 0,
        upcomingEmisNext7Days: statsData?.upcomingEmisNext7Days || 0,
        upcomingEmisNext30Days: statsData?.upcomingEmisNext30Days || 0,
        onTimePayments: statsData?.onTimePayments || 0,
        latePayments: statsData?.latePayments || 0,
        missedEmis: statsData?.missedEmis || 0,
        penaltyLateFeeGeneratedAmount: Number(statsData?.penaltyLateFeeGeneratedAmount || 0),
        penaltyLateFeeGeneratedCount: statsData?.penaltyLateFeeGeneratedCount || 0,
      });
      setAllApplications(appList);

      const extractObjectIdTime = (id) => {
        if (!id || typeof id !== "string" || id.length < 8) return 0;
        const hex = id.slice(0, 8);
        const seconds = Number.parseInt(hex, 16);
        return Number.isNaN(seconds) ? 0 : seconds * 1000;
      };

      const sortedRecent = [...appList]
        .sort((a, b) => {
          const aTime = a?.reviewedAt
            ? new Date(a.reviewedAt).getTime()
            : extractObjectIdTime(a?.applicationId);
          const bTime = b?.reviewedAt
            ? new Date(b.reviewedAt).getTime()
            : extractObjectIdTime(b?.applicationId);
          return bTime - aTime;
        })
        .slice(0, 6);

      setRecentApps(sortedRecent);
    } catch (error) {
      alert("Failed to load dashboard data");
    }
  };

  const monthlyTrend = useMemo(() => {
    const now = new Date();
    const keys = [];
    const keySet = new Set();

    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      keys.push({
        key,
        label: d.toLocaleString("en-IN", { month: "short" }),
      });
      keySet.add(key);
    }

    const extractObjectIdTime = (id) => {
      if (!id || typeof id !== "string" || id.length < 8) return 0;
      const hex = id.slice(0, 8);
      const seconds = Number.parseInt(hex, 16);
      return Number.isNaN(seconds) ? 0 : seconds * 1000;
    };

    const counts = {};
    keys.forEach((item) => {
      counts[item.key] = 0;
    });

    allApplications.forEach((app) => {
      const rawTime = app?.reviewedAt
        ? new Date(app.reviewedAt).getTime()
        : extractObjectIdTime(app?.applicationId);
      if (!rawTime) return;
      const dt = new Date(rawTime);
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
      if (keySet.has(key)) {
        counts[key] += 1;
      }
    });

    return keys.map((item) => ({
      label: item.label,
      value: counts[item.key],
    }));
  }, [allApplications]);

  const trendMax = useMemo(
    () => Math.max(...monthlyTrend.map((item) => item.value), 1),
    [monthlyTrend]
  );
  const trendMid = useMemo(() => Math.ceil(trendMax / 2), [trendMax]);
  const trendLinePoints = useMemo(() => {
    const width = 520;
    const height = 210;
    const paddingX = 16;
    const paddingY = 14;
    const plotWidth = width - paddingX * 2;
    const plotHeight = height - paddingY * 2;

    if (!monthlyTrend.length) {
      return [];
    }

    return monthlyTrend.map((item, index) => {
      const x =
        paddingX +
        (index / Math.max(monthlyTrend.length - 1, 1)) * plotWidth;
      const y = paddingY + (1 - item.value / trendMax) * plotHeight;
      return { x, y, value: item.value, label: item.label };
    });
  }, [monthlyTrend, trendMax]);

  const trendPolyline = useMemo(
    () => trendLinePoints.map((point) => `${point.x},${point.y}`).join(" "),
    [trendLinePoints]
  );

  const statusMix = useMemo(() => {
    const mix = allApplications.reduce(
      (acc, app) => {
        const status = String(app?.status || "").toUpperCase();
        if (status === "APPROVED") acc.approved += 1;
        else if (status === "REJECTED") acc.rejected += 1;
        else acc.pending += 1;
        return acc;
      },
      { approved: 0, rejected: 0, pending: 0 }
    );
    const total = mix.approved + mix.rejected + mix.pending;
    return { ...mix, total };
  }, [allApplications]);

  const donutStyle = useMemo(() => {
    const total = statusMix.total || 1;
    const approvedPct = (statusMix.approved / total) * 100;
    const rejectedPct = (statusMix.rejected / total) * 100;
    const pendingPct = 100 - approvedPct - rejectedPct;
    return {
      background: `conic-gradient(
        #22c55e 0% ${approvedPct}%,
        #1f4f8a ${approvedPct}% ${approvedPct + pendingPct}%,
        #ef4444 ${approvedPct + pendingPct}% 100%
      )`,
    };
  }, [statusMix]);

  const statusPercentages = useMemo(() => {
    const total = statusMix.total || 1;
    return {
      approved: Math.round((statusMix.approved / total) * 100),
      pending: Math.round((statusMix.pending / total) * 100),
      rejected: Math.round((statusMix.rejected / total) * 100),
    };
  }, [statusMix]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    navigate("/admin/login");
  };

  const formatInr = (value) =>
    `INR ${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

  return (
    <AdminLayout>
      <div className="dashboard">
        <section className="dashboard-hero">
          <div className="dashboard-header">
            <div>
              <h1>Dashboard</h1>
              <p>Track portfolio health, approvals, and customer demand in one place.</p>
            </div>

            <div className="profile-menu-wrap">
              <button
                className="profile-trigger"
                onClick={() => setProfileOpen((prev) => !prev)}
              >
                <span className="profile-trigger-circle">{adminInitial}</span>
                <span className="profile-trigger-name">{adminName}</span>
              </button>

              {profileOpen && (
                <div className="profile-dropdown">
                  <button onClick={() => navigate("/admin/settings")}>
                    Show Profile
                  </button>
                  <button onClick={handleLogout}>Logout</button>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="stats-grid">
          <article className="metric-card metric-card-green">
            <span className="metric-pill">Total Loans Issued</span>
            <h2>{stats.totalLoansIssued}</h2>
            <p>Disbursed + active + closed</p>
          </article>
          <article className="metric-card metric-card-blue">
            <span className="metric-pill">Active Loans</span>
            <h2>{stats.activeLoans}</h2>
            <p>Currently running accounts</p>
          </article>
          <article className="metric-card metric-card-blue">
            <span className="metric-pill">Total Customers</span>
            <h2>{stats.totalCustomers}</h2>
            <p>Registered customer accounts</p>
          </article>
          <article className="metric-card metric-card-green">
            <span className="metric-pill">Closed Loans</span>
            <h2>{stats.closedLoans}</h2>
            <p>Successfully completed loans</p>
          </article>
        </section>

        <section className="dashboard-row-block">
          <div className="table-label">
            <h3>Loan Application Status</h3>
            <p>Current application pipeline snapshot</p>
          </div>
          <div className="stats-grid">
            <article className="metric-card metric-card-blue">
              <span className="metric-pill">Pending Applications</span>
              <h2>{stats.pendingApplications}</h2>
              <p>Awaiting review decision</p>
            </article>
            <article className="metric-card metric-card-green">
              <span className="metric-pill">Approved Applications</span>
              <h2>{stats.approvedApplications}</h2>
              <p>Eligible for next processing</p>
            </article>
            <article className="metric-card metric-card-red">
              <span className="metric-pill">Rejected Applications</span>
              <h2>{stats.rejectedApplications}</h2>
              <p>Not eligible after review</p>
            </article>
            <article className="metric-card metric-card-blue">
              <span className="metric-pill">Total Applications</span>
              <h2>{stats.total}</h2>
              <p>All submitted applications</p>
            </article>
          </div>
        </section>

        <section className="dashboard-kpi-sections">
          <article className="kpi-section-card">
            <h3>Financial Overview</h3>
            <div className="kpi-grid">
              <div className="kpi-item"><span>Total Amount Disbursed</span><strong>{formatInr(stats.totalAmountDisbursed)}</strong></div>
              <div className="kpi-item"><span>Total Outstanding Principal</span><strong>{formatInr(stats.totalOutstandingPrincipal)}</strong></div>
              <div className="kpi-item"><span>EMI Collected (Today)</span><strong>{formatInr(stats.emiCollectedToday)}</strong></div>
              <div className="kpi-item"><span>EMI Collected (Month)</span><strong>{formatInr(stats.emiCollectedThisMonth)}</strong></div>
              <div className="kpi-item"><span>Overdue Amount</span><strong>{formatInr(stats.overdueAmount)}</strong></div>
              <div className="kpi-item"><span>Prepayment Amount</span><strong>{formatInr(stats.prepaymentAmount)}</strong></div>
              <div className="kpi-item"><span>Excess Payment Amount</span><strong>{formatInr(stats.excessPaymentAmount)}</strong></div>
            </div>
          </article>

          <article className="kpi-section-card">
            <h3>Repayment Monitoring</h3>
            <div className="kpi-grid">
              <div className="kpi-item kpi-item-positive-blue"><span>Upcoming EMIs (Next 7 Days)</span><strong>{stats.upcomingEmisNext7Days}</strong></div>
              <div className="kpi-item kpi-item-positive-blue"><span>Upcoming EMIs (Next 30 Days)</span><strong>{stats.upcomingEmisNext30Days}</strong></div>
              <div className="kpi-item kpi-item-positive-green"><span>On-Time Payments</span><strong>{stats.onTimePayments}</strong></div>
              <div className="kpi-item kpi-item-warning"><span>Late Payments</span><strong>{stats.latePayments}</strong></div>
              <div className="kpi-item kpi-item-danger"><span>Missed EMIs</span><strong>{stats.missedEmis}</strong></div>
              <div className="kpi-item kpi-item-warning"><span>Penalty / Late Fee Generated</span><strong>{formatInr(stats.penaltyLateFeeGeneratedAmount)} ({stats.penaltyLateFeeGeneratedCount})</strong></div>
            </div>
          </article>
        </section>

        <section className="dashboard-analytics-section">
          <div className="table-label dashboard-analytics-header">
            <h3>Application Insights</h3>
            <p>Trend and status distribution overview</p>
          </div>

          <div className="dashboard-analytics-grid">
          <article className="analytics-card">
            <div className="analytics-title-wrap">
              <h3>Application Trend (6 months)</h3>
              <span>{allApplications.length} records</span>
            </div>
            <div className="trend-chart-shell">
              <div className="trend-y-axis">
                <span>{trendMax}</span>
                <span>{trendMid}</span>
                <span>0</span>
              </div>
              <div className="trend-line-wrap">
                <svg
                  className="trend-line-chart"
                  viewBox="0 0 520 210"
                  preserveAspectRatio="none"
                >
                  <line x1="16" y1="14" x2="504" y2="14" className="trend-grid-line" />
                  <line x1="16" y1="105" x2="504" y2="105" className="trend-grid-line" />
                  <line x1="16" y1="196" x2="504" y2="196" className="trend-grid-line" />
                  <polyline points={trendPolyline} className="trend-line-stroke" />
                  {trendLinePoints.map((point) => (
                    <circle
                      key={point.label}
                      cx={point.x}
                      cy={point.y}
                      r="4"
                      className="trend-line-point"
                    >
                      <title>
                        {point.label}: {point.value}
                      </title>
                    </circle>
                  ))}
                </svg>
                <div className="trend-x-axis">
                  {monthlyTrend.map((item) => (
                    <div key={item.label} className="trend-x-item">
                      <strong>{item.value}</strong>
                      <small>{item.label}</small>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </article>

          <article className="analytics-card">
            <div className="analytics-title-wrap">
              <h3>Loan Status Overview</h3>
              <span>Distribution</span>
            </div>
            <div className="status-overview">
              <div className="status-donut" style={donutStyle} />
              <div className="status-legend">
                <div>
                  <span className="legend-dot legend-green" />
                  Approved: {statusMix.approved} ({statusPercentages.approved}%)
                </div>
                <div>
                  <span className="legend-dot legend-blue" />
                  Pending: {statusMix.pending} ({statusPercentages.pending}%)
                </div>
                <div>
                  <span className="legend-dot legend-red" />
                  Rejected: {statusMix.rejected} ({statusPercentages.rejected}%)
                </div>
              </div>
            </div>
          </article>
          </div>
        </section>

        <section className="recent-apps-wrap">
          <div className="table-label">
            <h3>Recent Applications</h3>
            <p>Latest submissions and review activity</p>
          </div>
          <div className="table-section">
            <table>
              <thead>
                <tr>
                  <th>Application ID</th>
                  <th>Customer Name</th>
                  <th>Loan Type</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentApps.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="no-data">
                      No recent applications found
                    </td>
                  </tr>
                ) : (
                  recentApps.map((app) => (
                    <tr key={app.applicationId}>
                      <td>{app.applicationId}</td>
                      <td>{app.customerName || "-"}</td>
                      <td>{app.loanTypeId}</td>
                      <td>INR {Number(app.amount || 0).toLocaleString("en-IN")}</td>
                      <td>
                        <span className={`status ${app.status?.toLowerCase()}`}>
                          {app.status}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="view-btn"
                          onClick={() =>
                            navigate(`/admin/applications/${app.applicationId}`)
                          }
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}

export default AdminDashboard;
