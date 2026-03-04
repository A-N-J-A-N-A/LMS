import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import AdminLayout from "../../Components/admin/AdminLayout";
import { getAdminAnalyticsSummary } from "../../services/admin/adminAnalyticsService";
import "../../styles/admin/analytics.css";

function AdminAnalytics() {
  const navigate = useNavigate();
  const role = localStorage.getItem("role");
  const [days, setDays] = useState(7);

  // 🔐 Role protection (same behavior)
  useEffect(() => {
    if (role !== "ADMIN") {
      navigate("/admin/login");
    }
  }, [role, navigate]);

  // ✅ TanStack Query replaces loadSummary + loading + summary state
  const {
    data,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["adminAnalyticsSummary", days],
    queryFn: () => getAdminAnalyticsSummary(days),
    enabled: role === "ADMIN",
  });

  // Normalize response exactly like before
  const summary = {
    totalSessions: Number(data?.totalSessions || 0),
    totalEvents: Number(data?.totalEvents || 0),
    topDropOffPages: Array.isArray(data?.topDropOffPages)
      ? data.topDropOffPages
      : [],
    pagePerformance: Array.isArray(data?.pagePerformance)
      ? data.pagePerformance
      : [],
  };

  return (
    <AdminLayout>
      <div className="analytics-page">
        <div className="analytics-header">
          <div>
            <h1>User Behavior Analytics</h1>
            <p>
              Find drop-off pages and likely reasons from performance and API signals.
            </p>
          </div>

          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            <option value={1}>Today</option>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
          </select>
        </div>

        <div className="analytics-cards">
          <div className="analytics-card">
            <h3>Total Sessions</h3>
            <strong>{summary.totalSessions}</strong>
          </div>

          <div className="analytics-card">
            <h3>Total Tracked Events</h3>
            <strong>{summary.totalEvents}</strong>
          </div>
        </div>

        <div className="analytics-table-card">
          <h2>Top Drop-Off Pages</h2>
          <table className="analytics-table">
            <thead>
              <tr>
                <th>Page</th>
                <th>Visits</th>
                <th>Exits</th>
                <th>Drop-Off %</th>
                <th>Avg Time (sec)</th>
                <th>Suspected Reason</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="analytics-empty">
                    Loading...
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan="6" className="analytics-empty">
                    Failed to load analytics
                  </td>
                </tr>
              ) : summary.topDropOffPages.length === 0 ? (
                <tr>
                  <td colSpan="6" className="analytics-empty">
                    No data yet
                  </td>
                </tr>
              ) : (
                summary.topDropOffPages.map((row, index) => (
                  <tr key={`${row.pagePath}-${index}`}>
                    <td>{row.pagePath}</td>
                    <td>{row.visits}</td>
                    <td>{row.exits}</td>
                    <td>{row.dropOffRate}%</td>
                    <td>{row.avgTimeOnPageSeconds}</td>
                    <td>{row.suspectedReason}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="analytics-table-card">
          <h2>Page Performance Signals</h2>
          <table className="analytics-table">
            <thead>
              <tr>
                <th>Page</th>
                <th>Avg LCP (ms)</th>
                <th>Avg INP (ms)</th>
                <th>Avg CLS</th>
                <th>Avg TTFB (ms)</th>
                <th>API Error %</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="analytics-empty">
                    Loading...
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan="6" className="analytics-empty">
                    Failed to load analytics
                  </td>
                </tr>
              ) : summary.pagePerformance.length === 0 ? (
                <tr>
                  <td colSpan="6" className="analytics-empty">
                    No data yet
                  </td>
                </tr>
              ) : (
                summary.pagePerformance.map((row, index) => (
                  <tr key={`${row.pagePath}-${index}`}>
                    <td>{row.pagePath}</td>
                    <td>{row.avgLcpMs}</td>
                    <td>{row.avgInpMs}</td>
                    <td>{row.avgCls}</td>
                    <td>{row.avgTtfbMs}</td>
                    <td>{row.apiErrorRate}%</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}

export default AdminAnalytics;


{/*import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../Components/admin/AdminLayout";
import { getAdminAnalyticsSummary } from "../../services/admin/adminAnalyticsService";
import "../../styles/admin/analytics.css";

function AdminAnalytics() {
  const rowsPerPage = 5;
  const navigate = useNavigate();
  const role = localStorage.getItem("role");
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [dropOffPage, setDropOffPage] = useState(1);
  const [performancePage, setPerformancePage] = useState(1);
  const [summary, setSummary] = useState({
    totalSessions: 0,
    totalEvents: 0,
    topDropOffPages: [],
    pagePerformance: [],
  });

  useEffect(() => {
    if (role !== "ADMIN") {
      navigate("/admin/login");
      return;
    }
    loadSummary(days);
  }, [role, navigate, days]);

  useEffect(() => {
    setDropOffPage(1);
    setPerformancePage(1);
  }, [days]);

  const loadSummary = async (selectedDays) => {
    try {
      setLoading(true);
      const data = await getAdminAnalyticsSummary(selectedDays);
      setSummary({
        totalSessions: Number(data?.totalSessions || 0),
        totalEvents: Number(data?.totalEvents || 0),
        topDropOffPages: Array.isArray(data?.topDropOffPages) ? data.topDropOffPages : [],
        pagePerformance: Array.isArray(data?.pagePerformance) ? data.pagePerformance : [],
      });
      setDropOffPage(1);
      setPerformancePage(1);
    } catch (error) {
      setSummary({
        totalSessions: 0,
        totalEvents: 0,
        topDropOffPages: [],
        pagePerformance: [],
      });
      setDropOffPage(1);
      setPerformancePage(1);
      alert("Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  const dropOffTotalPages = Math.ceil(summary.topDropOffPages.length / rowsPerPage);
  const performanceTotalPages = Math.ceil(summary.pagePerformance.length / rowsPerPage);

  const dropOffStart = (dropOffPage - 1) * rowsPerPage;
  const performanceStart = (performancePage - 1) * rowsPerPage;

  const visibleDropOffRows = summary.topDropOffPages.slice(dropOffStart, dropOffStart + rowsPerPage);
  const visiblePerformanceRows = summary.pagePerformance.slice(
    performanceStart,
    performanceStart + rowsPerPage
  );

  return (
    <AdminLayout>
      <div className="analytics-page">
        <div className="analytics-header">
          <div>
            <h1>User Behavior Analytics</h1>
            <p>Find drop-off pages and likely reasons from performance and API signals.</p>
          </div>
          <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
            <option value={1}>Today</option>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
          </select>
        </div>

        <div className="analytics-cards">
          <div className="analytics-card">
            <h3>Total Sessions</h3>
            <strong>{summary.totalSessions}</strong>
          </div>
          <div className="analytics-card">
            <h3>Total Tracked Events</h3>
            <strong>{summary.totalEvents}</strong>
          </div>
        </div>

        <div className="analytics-table-card">
          <h2>Top Drop-Off Pages</h2>
          <table className="analytics-table">
            <thead>
              <tr>
                <th>Page</th>
                <th>Visits</th>
                <th>Exits</th>
                <th>Drop-Off %</th>
                <th>Avg Time (sec)</th>
                <th>Suspected Reason</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" className="analytics-empty">Loading...</td></tr>
              ) : summary.topDropOffPages.length === 0 ? (
                <tr><td colSpan="6" className="analytics-empty">No data yet</td></tr>
              ) : (
                visibleDropOffRows.map((row, index) => (
                  <tr key={`${row.pagePath}-${index}`}>
                    <td>{row.pagePath}</td>
                    <td>{row.visits}</td>
                    <td>{row.exits}</td>
                    <td>{row.dropOffRate}%</td>
                    <td>{row.avgTimeOnPageSeconds}</td>
                    <td>{row.suspectedReason}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {!loading && summary.topDropOffPages.length > 0 && (
            <div className="analytics-pagination">
              <button
                type="button"
                disabled={dropOffPage === 1}
                onClick={() => setDropOffPage((prev) => prev - 1)}
              >
                Prev
              </button>
              <span>Page {dropOffPage} of {dropOffTotalPages || 1}</span>
              <button
                type="button"
                disabled={dropOffPage === dropOffTotalPages || dropOffTotalPages === 0}
                onClick={() => setDropOffPage((prev) => prev + 1)}
              >
                Next
              </button>
            </div>
          )}
        </div>

        <div className="analytics-table-card">
          <h2>Page Performance Signals</h2>
          <table className="analytics-table">
            <thead>
              <tr>
                <th>Page</th>
                <th>Avg LCP (ms)</th>
                <th>Avg INP (ms)</th>
                <th>Avg CLS</th>
                <th>Avg TTFB (ms)</th>
                <th>API Error %</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" className="analytics-empty">Loading...</td></tr>
              ) : summary.pagePerformance.length === 0 ? (
                <tr><td colSpan="6" className="analytics-empty">No data yet</td></tr>
              ) : (
                visiblePerformanceRows.map((row, index) => (
                  <tr key={`${row.pagePath}-${index}`}>
                    <td>{row.pagePath}</td>
                    <td>{row.avgLcpMs}</td>
                    <td>{row.avgInpMs}</td>
                    <td>{row.avgCls}</td>
                    <td>{row.avgTtfbMs}</td>
                    <td>{row.apiErrorRate}%</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {!loading && summary.pagePerformance.length > 0 && (
            <div className="analytics-pagination">
              <button
                type="button"
                disabled={performancePage === 1}
                onClick={() => setPerformancePage((prev) => prev - 1)}
              >
                Prev
              </button>
              <span>Page {performancePage} of {performanceTotalPages || 1}</span>
              <button
                type="button"
                disabled={performancePage === performanceTotalPages || performanceTotalPages === 0}
                onClick={() => setPerformancePage((prev) => prev + 1)}
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

export default AdminAnalytics;*/}
