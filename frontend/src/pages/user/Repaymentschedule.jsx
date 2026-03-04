import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "../../Components/Navbar/Navbar";
import "../../styles/Repaymentschedule.css";
import {
  getLoanApplicationDetails,
  getUserApplications,
} from "../../services/loanService";

function RepaymentSchedule() {
  const yearsPerPage = 5;
  const navigate = useNavigate();
  const location = useLocation();
  const [scheduleData, setScheduleData] = useState([]);
  const [yearPage, setYearPage] = useState(1);
  const [application, setApplication] = useState(null);
  const [applicationId, setApplicationId] = useState("");
  const [accountOptions, setAccountOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadSchedule = async () => {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams(location.search);
        const idFromQuery = params.get("applicationId");
        const idFromState = location.state?.applicationId;
        const idFromStorage = localStorage.getItem("lastApplicationId");

        const appsRes = await getUserApplications();
        const applications = Array.isArray(appsRes.data) ? appsRes.data : [];
        const activeAccounts = applications
          .filter((app) => ["DISBURSED", "ACTIVE"].includes(String(app.status || "").toUpperCase()))
          .map((app) => ({
            ...app,
            accountId: app.applicationId || app.id || app._id || "",
          }))
          .filter((app) => app.accountId);

        const sortedAccounts = [...activeAccounts].sort(
          (a, b) =>
            new Date(b.disbursedAt || b.createdAt || 0) -
            new Date(a.disbursedAt || a.createdAt || 0)
        );
        setAccountOptions(sortedAccounts);

        if (!sortedAccounts.length) {
          setError("No active loan accounts found for this account.");
          return;
        }

        let selectedId = idFromQuery || idFromState || idFromStorage;
        const isSelectedIdActive = sortedAccounts.some((app) => app.accountId === selectedId);
        if (!isSelectedIdActive) {
          selectedId = sortedAccounts[0].accountId;
        }

        const detailsRes = await getLoanApplicationDetails(selectedId);
        const details = detailsRes.data;

        setApplicationId(selectedId);
        localStorage.setItem("lastApplicationId", selectedId);
        setApplication(details);
        setScheduleData(
          Array.isArray(details.repaymentSchedule)
            ? details.repaymentSchedule
            : []
        );
      } catch (err) {
        console.error(err);
        setError(
          err.response?.data?.message ||
            "Failed to load repayment schedule. Please try again."
        );
      } finally {
        setLoading(false);
      }
    };

    loadSchedule();
  }, [location.search, location.state]);

  const toAmount = (value) => Number(value || 0);

  const totals = useMemo(() => {
    const totalInterest = scheduleData.reduce(
      (sum, row) => sum + toAmount(row.interestAmount),
      0
    );
    const totalPayable = scheduleData.reduce(
      (sum, row) => sum + toAmount(row.totalPayment || row.amount),
      0
    );
    const monthlyEmi = scheduleData[0]?.totalPayment || scheduleData[0]?.amount || 0;

    return {
      totalLoanAmount: toAmount(application?.loanAmount),
      totalInterest,
      totalPayable,
      monthlyEmi: toAmount(monthlyEmi),
    };
  }, [application, scheduleData]);

  const scheduleOverview = useMemo(() => {
    const paidCount = scheduleData.filter(
      (row) => String(row.status || "").toLowerCase() === "paid"
    ).length;
    const overdueCount = scheduleData.filter(
      (row) => String(row.status || "").toLowerCase() === "overdue"
    ).length;
    const upcomingCount = scheduleData.filter(
      (row) => !["paid", "overdue"].includes(String(row.status || "").toLowerCase())
    ).length;
    const nextDue =
      scheduleData.find((row) => !["paid"].includes(String(row.status || "").toLowerCase())) ||
      null;
    const progress = scheduleData.length
      ? Math.round((paidCount / scheduleData.length) * 100)
      : 0;

    return {
      paidCount,
      overdueCount,
      upcomingCount,
      nextDue,
      progress,
    };
  }, [scheduleData]);

  const yearlySchedule = useMemo(() => {
    const grouped = new Map();

    scheduleData.forEach((row, index) => {
      const fallbackYear = "Unknown";
      const parsed = row?.dueDate ? new Date(row.dueDate) : null;
      const year =
        parsed && !Number.isNaN(parsed.getTime())
          ? String(parsed.getFullYear())
          : fallbackYear;

      if (!grouped.has(year)) {
        grouped.set(year, []);
      }

      grouped.get(year).push({ ...row, __index: index });
    });

    return Array.from(grouped.entries())
      .map(([year, rows]) => ({
        year,
        rows: [...rows].sort((a, b) => {
          const aTime = a?.dueDate ? new Date(a.dueDate).getTime() : 0;
          const bTime = b?.dueDate ? new Date(b.dueDate).getTime() : 0;
          return aTime - bTime;
        }),
      }))
      .sort((a, b) => {
        if (a.year === "Unknown") return 1;
        if (b.year === "Unknown") return -1;
        return Number(a.year) - Number(b.year);
      });
  }, [scheduleData]);

  const totalYearPages = Math.ceil(yearlySchedule.length / yearsPerPage);
  const yearStartIndex = (yearPage - 1) * yearsPerPage;
  const visibleYearBlocks = yearlySchedule.slice(yearStartIndex, yearStartIndex + yearsPerPage);

  useEffect(() => {
    setYearPage(1);
  }, [applicationId, scheduleData.length]);

  const formatMoney = (value) =>
    `Rs ${toAmount(value).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const formatDate = (value) => {
    if (!value) return "-";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString("en-GB");
  };

  const formatLoanType = (loanTypeId) =>
    String(loanTypeId || "-")
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());

  const formatStatus = (status) =>
    String(status || "-")
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());

  const selectedAccount = accountOptions.find((account) => account.accountId === applicationId) || null;

  const getStatusLabel = (status) => {
    const value = String(status || "upcoming").toLowerCase();
    if (value === "paid") return "Paid";
    if (value === "overdue") return "Overdue";
    return "Upcoming";
  };

  const buildRepaymentPdfBlob = () => {
    const accountLabel = selectedAccount
      ? `${formatLoanType(selectedAccount.loanTypeId)} | ${applicationId} | ${formatStatus(
          selectedAccount.status
        )}`
      : applicationId || "-";

    const summaryLines = [
      `Generated At: ${new Date().toLocaleString("en-IN")}`,
      `Account: ${accountLabel}`,
      `Total Loan Amount: ${formatMoney(totals.totalLoanAmount)}`,
      `Total Interest: ${formatMoney(totals.totalInterest)}`,
      `Total Payable: ${formatMoney(totals.totalPayable)}`,
      `Monthly EMI: ${formatMoney(totals.monthlyEmi)}`,
    ];

    const pad = (value, size, alignRight = false) => {
      const text = String(value ?? "-");
      if (text.length >= size) return text.slice(0, size);
      return alignRight ? text.padStart(size, " ") : text.padEnd(size, " ");
    };

    const rows = scheduleData.map((row, index) => {
      const lineNo = pad(row.installmentNo || index + 1, 4);
      const dueDate = pad(formatDate(row.dueDate), 11);
      const principal = pad(formatMoney(row.principalAmount), 15, true);
      const interest = pad(formatMoney(row.interestAmount), 15, true);
      const total = pad(formatMoney(row.totalPayment || row.amount), 15, true);
      const balance = pad(formatMoney(row.balanceAmount), 16, true);
      const status = pad(getStatusLabel(row.status), 10);
      return `${lineNo} ${dueDate} ${principal} ${interest} ${total} ${balance} ${status}`;
    });

    const tableHeader =
      `${pad("No.", 4)} ${pad("Due Date", 11)} ${pad("Principal", 15)} ${pad("Interest", 15)} ${pad(
        "Total EMI",
        15
      )} ${pad("Outstanding", 16)} ${pad("Status", 10)}`;
    const tableDivider = "-".repeat(tableHeader.length);

    const allLines = [
      "CrediFlow - Repayment Schedule",
      "",
      ...summaryLines,
      "",
      tableHeader,
      tableDivider,
      ...rows,
    ];

    const escapePdfText = (value) =>
      String(value || "")
        .replace(/\\/g, "\\\\")
        .replace(/\(/g, "\\(")
        .replace(/\)/g, "\\)");

    const linesPerPage = 56;
    const pages = [];
    for (let i = 0; i < allLines.length; i += linesPerPage) {
      pages.push(allLines.slice(i, i + linesPerPage));
    }

    const objectCount = 3 + pages.length * 2;
    const objects = new Array(objectCount + 1);

    objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
    objects[2] = "<< /Type /Pages /Count 0 /Kids [] >>";
    objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>";

    const pageRefs = [];
    pages.forEach((pageLines, index) => {
      const pageObjectId = 4 + index * 2;
      const contentObjectId = pageObjectId + 1;
      pageRefs.push(`${pageObjectId} 0 R`);

      const contentBody =
        "BT\n" +
        "/F1 9 Tf\n" +
        "32 810 Td\n" +
        "12 TL\n" +
        pageLines
          .map((line, lineIndex) =>
            lineIndex === 0 ? `(${escapePdfText(line)}) Tj` : `T*\n(${escapePdfText(line)}) Tj`
          )
          .join("\n") +
        "\nET";

      objects[contentObjectId] = `<< /Length ${contentBody.length} >>\nstream\n${contentBody}\nendstream`;
      objects[pageObjectId] =
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] ` +
        `/Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjectId} 0 R >>`;
    });

    objects[2] = `<< /Type /Pages /Count ${pages.length} /Kids [${pageRefs.join(" ")}] >>`;

    const encoder = new TextEncoder();
    let pdf = "%PDF-1.4\n";
    const offsets = [0];

    for (let i = 1; i <= objectCount; i += 1) {
      offsets[i] = encoder.encode(pdf).length;
      pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`;
    }

    const xrefOffset = encoder.encode(pdf).length;
    pdf += `xref\n0 ${objectCount + 1}\n`;
    pdf += "0000000000 65535 f \n";
    for (let i = 1; i <= objectCount; i += 1) {
      pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
    }
    pdf += `trailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

    return new Blob([pdf], { type: "application/pdf" });
  };

  const handleExportPdf = () => {
    if (!scheduleData.length) return;
    const blob = buildRepaymentPdfBlob();
    const url = URL.createObjectURL(blob);
    const filename = `repayment-schedule-${String(applicationId || "account")
      .replace(/[^a-zA-Z0-9-_]/g, "-")
      .toLowerCase()}.pdf`;

    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="schedule-page">
          <div className="loading-container">
            <p>Loading repayment schedule...</p>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Navbar />
        <div className="schedule-page">
          <div className="schedule-container">
            <div className="schedule-header">
              <button className="back-button" onClick={() => navigate("/profile")}>
                Back
              </button>
              <h1>Repayment Schedule</h1>
            </div>
            <p className="error-text">{error}</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />

      <div className="schedule-page">
        <div className="schedule-container">
          <div className="schedule-header">
            <button className="back-button" onClick={() => navigate("/profile")}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M12.5 15L7.5 10L12.5 5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Back
            </button>
            <div className="schedule-title-block">
              <h1>Repayment Schedule</h1>
              <p>Track dues, repayment progress, and installment-level breakup in one place.</p>
            </div>
          </div>

          {accountOptions.length > 0 && selectedAccount && (
            <div className="account-panel">
              <div className="input-group">
                <label>Select Loan Account</label>
                <select
                  value={applicationId}
                  onChange={(e) => {
                    const nextId = e.target.value;
                    setApplicationId(nextId);
                    localStorage.setItem("lastApplicationId", nextId);
                    navigate(`/repayment-schedule?applicationId=${nextId}`);
                  }}
                >
                  {accountOptions.map((account) => (
                    <option key={account.accountId} value={account.accountId}>
                      {`${formatLoanType(account.loanTypeId)} | ${account.accountId} | ${formatStatus(account.status)}`}
                    </option>
                  ))}
                </select>
              </div>
              <div className="account-meta">
                <span>{formatLoanType(selectedAccount.loanTypeId)}</span>
                <span>{selectedAccount.accountId}</span>
                <span className={`meta-status ${String(selectedAccount.status || "").toLowerCase()}`}>
                  {formatStatus(selectedAccount.status)}
                </span>
              </div>
            </div>
          )}

          <div className="summary-cards">
            <div className="summary-card">
              <span className="summary-label">Total Loan Amount</span>
              <span className="summary-value">
                {formatMoney(totals.totalLoanAmount)}
              </span>
            </div>
            <div className="summary-card">
              <span className="summary-label">Total Interest</span>
              <span className="summary-value">
                {formatMoney(totals.totalInterest)}
              </span>
            </div>
            <div className="summary-card">
              <span className="summary-label">Total Payable</span>
              <span className="summary-value">
                {formatMoney(totals.totalPayable)}
              </span>
            </div>
            <div className="summary-card">
              <span className="summary-label">Monthly EMI</span>
              <span className="summary-value">{formatMoney(totals.monthlyEmi)}</span>
            </div>
            <div className="summary-card">
              <span className="summary-label">Installments Paid</span>
              <span className="summary-value">
                {scheduleOverview.paidCount}/{scheduleData.length || 0}
              </span>
            </div>
            <div className="summary-card">
              <span className="summary-label">Next Due</span>
              <span className="summary-value">
                {scheduleOverview.nextDue?.dueDate ? formatDate(scheduleOverview.nextDue.dueDate) : "-"}
              </span>
            </div>
            <div className="summary-card">
              <span className="summary-label">Overdue Installments</span>
              <span className="summary-value">{scheduleOverview.overdueCount}</span>
            </div>
          </div>

          <div className="progress-strip">
            <div className="progress-header">
              <span>Repayment Completion</span>
              <strong>{scheduleOverview.progress}%</strong>
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${scheduleOverview.progress}%` }}
              ></div>
            </div>
            <div className="progress-meta">
              <span>Paid: {scheduleOverview.paidCount}</span>
              <span>Upcoming: {scheduleOverview.upcomingCount}</span>
              <span>Overdue: {scheduleOverview.overdueCount}</span>
            </div>
          </div>

          <div className="table-wrapper">
            {scheduleData.length === 0 ? (
              <div className="empty-schedule">
                <h3>No repayment entries available</h3>
                <p>Repayment schedule will appear here once disbursement schedule is generated.</p>
              </div>
            ) : (
              <div className="yearly-schedule-wrap">
                <div className="yearly-schedule-label">Yearly Repayment Schedule</div>
                {visibleYearBlocks.map((block, blockIndex) => (
                  <details
                    className="year-block"
                    key={block.year}
                    open={blockIndex === 0}
                  >
                    <summary className="year-block-header">
                      <div className="year-block-title">
                        <h3>{block.year}</h3>
                        <p className="year-block-label">
                          Schedule Block #{yearStartIndex + blockIndex + 1}
                        </p>
                      </div>
                      <span>{block.rows.length} installment{block.rows.length > 1 ? "s" : ""}</span>
                    </summary>

                    <div className="year-block-content">
                      <table className="repayment-table">
                        <thead>
                          <tr>
                            <th>No.</th>
                            <th>Due Date</th>
                            <th>Principal</th>
                            <th>Interest</th>
                            <th>Total EMI</th>
                            <th>Outstanding Balance</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {block.rows.map((row, index) => (
                            <tr
                              key={`${block.year}-${row.installmentNo || index}-${row.dueDate || ""}`}
                              className={String(row.status || "").toLowerCase() === "paid" ? "paid-row" : ""}
                            >
                              <td className="no-cell">{row.installmentNo || row.__index + 1}</td>
                              <td>{formatDate(row.dueDate)}</td>
                              <td className="amount-cell">{formatMoney(row.principalAmount)}</td>
                              <td className="amount-cell">{formatMoney(row.interestAmount)}</td>
                              <td className="amount-cell total-cell">
                                {formatMoney(row.totalPayment || row.amount)}
                              </td>
                              <td className="amount-cell balance-cell">
                                {formatMoney(row.balanceAmount)}
                              </td>
                              <td>
                                <span className={`status-badge ${String(row.status || "upcoming").toLowerCase()}`}>
                                  {getStatusLabel(row.status)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                ))}

                {yearlySchedule.length > yearsPerPage && (
                  <div className="year-pagination">
                    <button
                      type="button"
                      disabled={yearPage === 1}
                      onClick={() => setYearPage((prev) => prev - 1)}
                    >
                      Prev
                    </button>
                    <span>
                      Year Page {yearPage} of {totalYearPages || 1}
                    </span>
                    <button
                      type="button"
                      disabled={yearPage === totalYearPages || totalYearPages === 0}
                      onClick={() => setYearPage((prev) => prev + 1)}
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="table-footer">
            <div className="footer-info">
              <span className="footer-text">
                Account: {selectedAccount
                  ? `${formatLoanType(selectedAccount.loanTypeId)} | ${applicationId} | ${formatStatus(selectedAccount.status)}`
                  : "-"}
              </span>
              <span className="footer-text">Total Records: {scheduleData.length}</span>
            </div>
            <div className="footer-actions">
              <button
                className="export-button"
                onClick={handleExportPdf}
                disabled={!scheduleData.length}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M14 10V12.6667C14 13.0203 13.8595 13.3594 13.6095 13.6095C13.3594 13.8595 13.0203 14 12.6667 14H3.33333C2.97971 14 2.64057 13.8595 2.39052 13.6095C2.14048 13.3594 2 13.0203 2 12.6667V10"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M4.66699 6.66669L8.00033 10L11.3337 6.66669"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M8 10V2"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Export
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default RepaymentSchedule;
