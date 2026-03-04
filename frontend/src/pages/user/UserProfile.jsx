import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../Components/Navbar/Navbar";
import ActiveLoans from "../../Components/ActiveLoans/ActiveLoans";
import "../../styles/UserProfile.css";
import { renderValue } from "../../utils/renderValue";
import { useQuery } from "@tanstack/react-query";
import {
  getLoanApplicationDetails,
  getMyPrepaymentRequests,
  getUserApplications,
  getUserLoans,
} from "../../services/loanService";
import api from "../../services/api";

function UserProfile() {
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [kycStatus, setKycStatus] = useState(null);
  const [loans, setLoans] = useState([]);
  const [loanAccounts, setLoanAccounts] = useState([]);
  const [selectedApplicationId, setSelectedApplicationId] = useState("");
  const [applicationDetails, setApplicationDetails] = useState(null);
  const [prepaymentRequests, setPrepaymentRequests] = useState([]);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    mobile: "",
    profileImage: "",
    dateOfBirth: "",
    gender: "",
    maritalStatus: "",
    address: "",
    occupation: "",
    company: "",
    monthlyIncome: "",
  });

  const navigate = useNavigate();

  const syncProfileImage = (image) => {
    localStorage.setItem("profileImage", image || "");
    window.dispatchEvent(new Event("profile-image-updated"));
  };

const {
  data: profileData,
  isLoading: profileLoading,
  isError: profileError,
} = useQuery({
  queryKey: ["userProfile"],
  queryFn: async () => {
    const [profileRes, kycRes, loansRes, appsRes] = await Promise.all([
      api.get("/user/profile"),
      api.get("/user/kyc/status"),
      getUserLoans(),
      getUserApplications(),
    ]);

    return {
      profile: profileRes.data,
      kyc: kycRes.data,
      loans: loansRes.data || [],
      applications: appsRes.data || [],
    };
  },
});

 useEffect(() => {
   if (!profileData) return;

   const { profile, kyc, loans, applications } = profileData;

   setUser(profile);
   syncProfileImage(profile.profileImage || "");

   setForm({
     fullName: profile.fullName || "",
     mobile: profile.mobile || "",
     profileImage: profile.profileImage || "",
     dateOfBirth: profile.dateOfBirth || "",
     gender: profile.gender || "",
     maritalStatus: profile.maritalStatus || "",
     address: profile.address || "",
     occupation: profile.occupation || "",
     company: profile.company || "",
     monthlyIncome: profile.monthlyIncome ?? "",
   });

   setKycStatus(kyc);
   setLoans(Array.isArray(loans) ? loans : []);

   const activeAccounts = applications
     ?.filter((app) =>
       ["DISBURSED", "ACTIVE"].includes(String(app.status || "").toUpperCase())
     )
     .map((app) => ({
       ...app,
       accountId: app.applicationId || app.id || app._id || "",
     }))
     .filter((app) => app.accountId);

   const sortedActiveAccounts = [...activeAccounts].sort(
     (a, b) =>
       new Date(b.disbursedAt || b.createdAt || 0) -
       new Date(a.disbursedAt || a.createdAt || 0)
   );

   setLoanAccounts(sortedActiveAccounts);

   if (sortedActiveAccounts.length) {
     const lastSelected = localStorage.getItem("lastApplicationId");
     const initialId =
       sortedActiveAccounts.find((a) => a.accountId === lastSelected)
         ?.accountId || sortedActiveAccounts[0].accountId;

     setSelectedApplicationId(initialId);
     localStorage.setItem("lastApplicationId", initialId);
   }
 }, [profileData]);




  const { data: loanDetailsData } = useQuery({
    queryKey: ["applicationDetails", selectedApplicationId],
    queryFn: async () => {
      const [detailsRes, prepayRes] = await Promise.all([
        getLoanApplicationDetails(selectedApplicationId),
        getMyPrepaymentRequests(selectedApplicationId),
      ]);

      return {
        details: detailsRes.data,
        prepayments: prepayRes.data || [],
      };
    },
    enabled: !!selectedApplicationId,
  });


  useEffect(() => {
    if (!loanDetailsData) return;

    setApplicationDetails(loanDetailsData.details);
    setPrepaymentRequests(
      Array.isArray(loanDetailsData.prepayments)
        ? loanDetailsData.prepayments
        : []
    );
  }, [loanDetailsData]);




  const toAmount = (value) => Number(value || 0);

  const stats = useMemo(() => {
    const totalLoanAmount = loans.reduce((sum, loan) => sum + toAmount(loan.amount), 0);
    const schedule = Array.isArray(applicationDetails?.repaymentSchedule)
      ? applicationDetails.repaymentSchedule
      : [];
    const paid = schedule.filter((item) => item.status === "paid");
    const upcoming =
      schedule.find((item) => (item.status || "").toLowerCase() !== "paid") || null;
    const lastPaid = paid.length ? paid[paid.length - 1] : null;

    const totalPayable = schedule.reduce(
      (sum, item) => sum + toAmount(item.totalPayment || item.amount),
      0
    );
    const totalPaid = paid.reduce(
      (sum, item) => sum + toAmount(item.totalPayment || item.amount),
      0
    );
    const remainingAmount = Math.max(totalPayable - totalPaid, 0);
    const percentage = totalPayable > 0 ? Math.round((totalPaid / totalPayable) * 100) : 0;

    let daysLeft = "-";
    if (upcoming?.dueDate) {
      const dueDate = new Date(upcoming.dueDate);
      if (!Number.isNaN(dueDate.getTime())) {
        const now = new Date();
        const diff = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        daysLeft = diff >= 0 ? diff : 0;
      }
    }

    return {
      totalLoanAmount,
      totalPaid,
      totalPayable,
      remainingAmount,
      percentage,
      upcoming,
      lastPaid,
      daysLeft,
    };
  }, [applicationDetails, loans]);

  const activeApprovedPrepayment = useMemo(
    () =>
      prepaymentRequests.find(
        (request) => request.status === "APPROVED" && !request.consumed
      ) || null,
    [prepaymentRequests]
  );

  const nextEmiDisplayAmount = useMemo(
    () =>
      activeApprovedPrepayment?.requestedAmount ||
      stats.upcoming?.totalPayment ||
      stats.upcoming?.amount ||
      0,
    [activeApprovedPrepayment, stats.upcoming]
  );

  const showNextEmiCard = Boolean(selectedApplicationId && stats.upcoming);
  const currentApplicationId = selectedApplicationId;
  const currentKycStatus = kycStatus?.kycStatus || user?.kycStatus || "";
  const currentKycStatusUpper = String(currentKycStatus || "").toUpperCase();
  const isKycPendingReview = currentKycStatus === "SUBMITTED";
  const isKycRejected = currentKycStatus === "REJECTED";
  const sortedApplications = useMemo(
    () =>
      [...loans].sort(
        (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
      ),
    [loans]
  );
  const trackedApplication = useMemo(() => {
    if (!sortedApplications.length) return null;

    if (selectedApplicationId) {
      const selected = sortedApplications.find((app) => {
        const id = app.applicationId || app.id || app._id || "";
        return id === selectedApplicationId;
      });
      if (selected) return selected;
    }

    return sortedApplications[0];
  }, [selectedApplicationId, sortedApplications]);
  const trackedLoanStatus = String(trackedApplication?.status || "").toUpperCase();
  const decisionCompleted = ["APPROVED", "REJECTED", "DISBURSED", "ACTIVE", "CLOSED"].includes(
    trackedLoanStatus
  );
  const disbursementCompleted = ["DISBURSED", "ACTIVE", "CLOSED"].includes(trackedLoanStatus);
  const lifecycleSteps = [
    { key: "apply", label: "Apply", completed: Boolean(trackedApplication) },
    { key: "kyc", label: "KYC", completed: currentKycStatusUpper === "VERIFIED" },
    { key: "decision", label: "Decision", completed: decisionCompleted },
    { key: "disbursement", label: "Disbursement", completed: disbursementCompleted },
    { key: "closure", label: "Closure", completed: trackedLoanStatus === "CLOSED" },
  ];
  const activeLifecycleIndex = lifecycleSteps.findIndex((step) => !step.completed);
  const currentLifecycleIndex =
    activeLifecycleIndex === -1 ? lifecycleSteps.length - 1 : activeLifecycleIndex;
  const decisionText =
    trackedLoanStatus === "REJECTED"
      ? "Rejected"
      : trackedLoanStatus === "APPROVED" ||
          trackedLoanStatus === "DISBURSED" ||
          trackedLoanStatus === "ACTIVE" ||
          trackedLoanStatus === "CLOSED"
        ? "Approved"
        : "Pending";

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

  const formatDateTime = (value) => {
    if (!value) return "-";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleString("en-GB");
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

  const getAccountLabel = (account) =>
    `${formatLoanType(account.loanTypeId)} | ${account.accountId || "-"} | ${formatStatus(account.status)}`;

  const getAge = (dob) => {
    if (!dob) return "-";
    const birthDate = new Date(dob);
    if (Number.isNaN(birthDate.getTime())) return "-";
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age -= 1;
    }
    return age >= 0 ? age : "-";
  };

  const onInput = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const onSaveProfile = async () => {
    setSaving(true);
    setError("");
    setSaveMessage("");

    try {
      const payload = {
        fullName: form.fullName || null,
        mobile: form.mobile || null,
        profileImage: form.profileImage !== undefined ? form.profileImage : null,
        dateOfBirth: form.dateOfBirth || null,
        gender: form.gender || null,
        maritalStatus: form.maritalStatus || null,
        address: form.address || null,
        occupation: form.occupation || null,
        company: form.company || null,
        monthlyIncome:
            form.monthlyIncome === "" ? null : Number(form.monthlyIncome),
      };

      const res = await api.put("/user/profile", payload);

      setUser(res.data);
      syncProfileImage(res.data.profileImage || "");

      setForm({
        fullName: res.data.fullName || "",
        mobile: res.data.mobile || "",
        profileImage: res.data.profileImage || "",
        dateOfBirth: res.data.dateOfBirth || "",
        gender: res.data.gender || "",
        maritalStatus: res.data.maritalStatus || "",
        address: res.data.address || "",
        occupation: res.data.occupation || "",
        company: res.data.company || "",
        monthlyIncome: res.data.monthlyIncome ?? "",
      });

      setSaveMessage("Profile updated successfully.");
      setEditing(false);

    } catch (err) {
      setError(err.response?.data?.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleProfileImageFile = async (file) => {
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setError("Profile image must be JPG, PNG or WEBP");
      return;
    }

    const toBase64 = () =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("Failed to read image"));
        reader.readAsDataURL(file);
      });

    try {
      setSaving(true);
      setError("");
      setSaveMessage("");
      const imageData = await toBase64();
      const res = await api.put("/user/profile", { profileImage: imageData });
      setUser(res.data);
      setForm((prev) => ({ ...prev, profileImage: res.data.profileImage || "" }));
      syncProfileImage(res.data.profileImage || "");
      setSaveMessage("Profile image updated successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update profile image.");
    } finally {
      setSaving(false);
    }
  };

  const removeProfileImage = async () => {
    try {
      setSaving(true);
      setError("");
      setSaveMessage("");
      const res = await api.put("/user/profile", { profileImage: "" });
      setUser(res.data);
      setForm((prev) => ({ ...prev, profileImage: "" }));
      syncProfileImage("");
      setSaveMessage("Profile image removed successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to remove profile image.");
    } finally {
      setSaving(false);
    }
  };

  if (profileError) {
    return (
      <>
        <Navbar noSpacer />
        <div className="profile-page">
          <p className="error-text">{error}</p>
        </div>
      </>
    );
  }

  if (profileLoading || !user) {
    return (
      <>
        <Navbar noSpacer />
        <div className="profile-page">
          <div className="loading-container">
            <p>Loading user data...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar noSpacer />

      <div className="profile-page">
        <div className="profile-header">
          <div className="profile-left">
            <div className="profile-photo">
              <div className="profile-circle">
                {user.profileImage ? (
                  <img src={user.profileImage} alt="Profile" className="user-profile-image" />
                ) : (
                  user.fullName?.charAt(0).toUpperCase() || "U"
                )}
              </div>
              <div className="online-badge"></div>
              <div className="profile-image-actions">
                <label className="inline-edit-link">
                  {user.profileImage ? "Change photo" : "Upload photo"}
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp"
                    className="profile-image-input"
                    onChange={(e) => handleProfileImageFile(e.target.files?.[0])}
                  />
                </label>
                {user.profileImage && (
                  <span className="inline-edit-link cancel" onClick={removeProfileImage}>
                    Remove
                  </span>
                )}
              </div>
            </div>
            <div className="profile-info">
              <h1>{renderValue(user.fullName)}</h1>
              <div className="profile-meta">
                <span className="customer-id">Customer ID: {renderValue(user.id)}</span>
                {kycStatus?.kycCompleted && (
                  <span className="kyc-badge">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path
                        d="M11.6667 3.5L5.25 9.91667L2.33333 7"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    KYC Verified
                  </span>
                )}
              </div>
            </div>
          </div>

          {!kycStatus?.kycCompleted && !isKycPendingReview && (
              <button
                  className="kyc-update-btn-header"
                  onClick={() => navigate("/profile/update-kyc")}
              >
                {isKycRejected ? "Resubmit KYC" : "Complete KYC"}
              </button>
          )}

          {isKycPendingReview && (
            <button className="kyc-update-btn-header" disabled>
              KYC Verification Pending
            </button>
          )}
        </div>

        {saveMessage && (
          <p className="success-text">{saveMessage}</p>
        )}

        {loanAccounts.length > 0 && (
          <div className="section-card">
            <div className="section-header">
              <h2>Active Loan Accounts</h2>
            </div>
            <div className="info-item">
              <span className="info-label">Select Loan Account</span>
              <select
                className="admin-input"
                value={selectedApplicationId}
                onChange={(e) => {
                  const nextId = e.target.value;
                  setSelectedApplicationId(nextId);
                  localStorage.setItem("lastApplicationId", nextId);
                }}
              >
                {loanAccounts.map((account) => (
                  <option key={account.accountId} value={account.accountId}>
                    {getAccountLabel(account)}
                  </option>
                ))}
              </select>
            </div>
            <div className="info-row">
              <div className="info-item">
                <span className="info-label">Loan Type</span>
                <span className="info-value">
                  {applicationDetails?.loanTypeId
                    ? formatLoanType(applicationDetails.loanTypeId)
                    : "-"}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Account ID</span>
                <span className="info-value">{selectedApplicationId || "-"}</span>
              </div>
            </div>
            <div className="info-row">
              <div className="info-item">
                <span className="info-label">Loan Status</span>
                <span className="info-value">{formatStatus(applicationDetails?.status)}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Disbursed Amount</span>
                <span className="info-value">{formatMoney(applicationDetails?.disbursedAmount || 0)}</span>
              </div>
            </div>
          </div>
        )}

        <div className="section-card">
          <div className="section-header">
            <h2>Track Application</h2>
          </div>
          {!trackedApplication ? (
            <p className="stat-subtext">No applications found.</p>
          ) : (
            <>
              <div className="lifecycle-meta">
                <span>
                  <strong>Application ID:</strong>{" "}
                  {trackedApplication.applicationId || trackedApplication.id || "-"}
                </span>
                <span>
                  <strong>Decision:</strong> {decisionText}
                </span>
              </div>
              <div className="lifecycle-track">
                {lifecycleSteps.map((step, index) => {
                  const stateClass = step.completed
                    ? "completed"
                    : index === currentLifecycleIndex
                      ? "current"
                      : "upcoming";

                  return (
                    <div key={step.key} className={`lifecycle-step ${stateClass}`}>
                      <div className="lifecycle-marker">{index + 1}</div>
                      <div className="lifecycle-label">{step.label}</div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="summary-stats-grid">
          <div className="stat-card total-loan">
            <div className="stat-content">
              <p className="stat-label">Total Loan Amount</p>
              <h3 className="stat-value">{formatMoney(stats.totalLoanAmount)}</h3>
              <p className="stat-subtext">Loans: {loans.length}</p>
            </div>
          </div>

          <div className="stat-card last-paid">
            <div className="stat-content">
              <p className="stat-label">Last Paid EMI</p>
              <h3 className="stat-value">
                {stats.lastPaid ? formatMoney(stats.lastPaid.totalPayment || stats.lastPaid.amount) : "-"}
              </h3>
              <p className="stat-subtext">
                {stats.lastPaid ? formatDate(stats.lastPaid.dueDate) : "No paid installments yet"}
              </p>
            </div>
          </div>

          <div className="stat-card next-due">
            <div className="stat-content">
              <p className="stat-label">Next Due Date</p>
              <h3 className="stat-value">{stats.upcoming ? formatDate(stats.upcoming.dueDate) : "-"}</h3>
              <p className="stat-subtext">
                {typeof stats.daysLeft === "number"
                  ? `${stats.daysLeft} days left`
                  : "No upcoming installments"}
              </p>
            </div>
          </div>

          <div className="stat-card wallet">
            <div className="stat-content">
              <p className="stat-label">Wallet Balance</p>
              <h3 className="stat-value">{formatMoney(user.walletBalance || 0)}</h3>
              <p className="stat-subtext">Updated only on wallet transactions</p>
            </div>
          </div>
        </div>

        <div className="section-card">
          <div className="section-header">
            <h2>Loan Repayment Progress</h2>
          </div>
          <div className="progress-container">
            <div className="progress-header">
              <span className="progress-label">Loan Repaid</span>
              <span className="progress-percentage">{stats.percentage}%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${stats.percentage}%` }}></div>
            </div>
          </div>
          <div className="loan-stats">
            <div className="stat-item">
              <div className="stat-label">Total Payable</div>
              <div className="stat-value">{formatMoney(stats.totalPayable)}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Total Paid</div>
              <div className="stat-value">{formatMoney(stats.totalPaid)}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Remaining Amount</div>
              <div className="stat-value">{formatMoney(stats.remainingAmount)}</div>
            </div>
          </div>
        </div>

        {showNextEmiCard && (
          <div className="next-emi-card">
            <div className="emi-header">
              <h3>Next EMI Payment</h3>
            </div>
            <div className="emi-body">
              <div className="emi-amount">
                {formatMoney(nextEmiDisplayAmount)}
              </div>
              <div className="emi-details">
                <div className="emi-detail-item">
                  <span className="emi-detail-label">Due Date</span>
                  <span className="emi-detail-value">{formatDate(stats.upcoming.dueDate)}</span>
                </div>
                <div className="emi-detail-item">
                  <span className="emi-detail-label">Remaining Tenure</span>
                  <span className="emi-detail-value">{applicationDetails?.tenure || "-"} Months</span>
                </div>
              </div>
              <div className="emi-buttons">
                <button
                  className="btn-pay-now"
                  onClick={() =>
                    navigate(
                      `/payment${
                        currentApplicationId
                          ? `?applicationId=${currentApplicationId}&action=pay`
                          : "?action=pay"
                      }`
                    )
                  }
                >
                  Pay Now
                </button>
                <button
                  className="btn-pay-now"
                  onClick={() =>
                    navigate(
                      `/payment${
                        currentApplicationId
                          ? `?applicationId=${currentApplicationId}&action=prepayment`
                          : "?action=prepayment"
                      }`
                    )
                  }
                >
                  Request Loan Prepayment
                </button>
                <button
                  className="btn-pay-now"
                  onClick={() =>
                    navigate(
                      `/payment${
                        currentApplicationId
                          ? `?applicationId=${currentApplicationId}&action=foreclosure`
                          : "?action=foreclosure"
                      }`
                    )
                  }
                >
                  Foreclose Loan
                </button>

                <button
                  className="btn-view-schedule"
                  onClick={() =>
                    navigate(
                      `/repayment-schedule${
                        selectedApplicationId ? `?applicationId=${selectedApplicationId}` : ""
                      }`
                    )
                  }
                >
                  View Schedule
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="two-column-layout">
          <div className="info-card personal-info-card">
            <div className="card-header personal-header">
              <h3>Personal Information</h3>
              {!editing && (
                  <span
                      className="inline-edit-link"
                      onClick={() => {
                        setEditing(true);
                        setSaveMessage("");
                      }}
                    >
                    Edit
                  </span>
              )}

              {editing && (
                  <span
                      className="inline-edit-link cancel"
                      onClick={() => {
                        setForm({
                          fullName: user.fullName || "",
                          mobile: user.mobile || "",
                          profileImage: user.profileImage || "",
                          dateOfBirth: user.dateOfBirth || "",
                          gender: user.gender || "",
                          maritalStatus: user.maritalStatus || "",
                          address: user.address || "",
                          occupation: user.occupation || "",
                          company: user.company || "",
                          monthlyIncome: user.monthlyIncome ?? "",
                        });
                        setEditing(false);
                      }}
                  >
                    Cancel
                  </span>
              )}

            </div>
            {!editing ? (
                <div className="info-grid">

                <div className="info-row">
                  <div className="info-item">
                    <span className="info-label">Full Name</span>
                    <span className="info-value">{renderValue(user.fullName)}</span>
                  </div>
                </div>

                  <div className="info-row">
                    <div className="info-item">
                      <span className="info-label">Age</span>
                      <span className="info-value">{getAge(user.dateOfBirth)}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Date of Birth</span>
                      <span className="info-value">{formatDate(user.dateOfBirth)}</span>
                    </div>
                  </div>

                  <div className="info-row">
                    <div className="info-item">
                      <span className="info-label">Gender</span>
                      <span className="info-value">{renderValue(user.gender)}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Marital Status</span>
                      <span className="info-value">{renderValue(user.maritalStatus)}</span>
                    </div>
                  </div>

                  <div className="info-item">
                    <span className="info-label">Address</span>
                    <span className="info-value">{renderValue(user.address)}</span>
                  </div>

                  <div className="info-row">
                    <div className="info-item">
                      <span className="info-label">Occupation</span>
                      <span className="info-value">{renderValue(user.occupation || user.employmentType)}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Company</span>
                      <span className="info-value">{renderValue(user.company)}</span>
                    </div>
                  </div>

                  <div className="info-item">
                    <span className="info-label">Monthly Income</span>
                    <span className="info-value">{user.monthlyIncome ? formatMoney(user.monthlyIncome) : "-"}
                    </span>
                  </div>

                </div>
            ) : (
              <div className="info-grid">
                <div className="info-row">
                  <div className="info-item">
                    <span className="info-label">Full Name</span>
                    <input
                      className="admin-input"
                      value={form.fullName}
                      onChange={(e) => onInput("fullName", e.target.value)}
                    />
                  </div>
                </div>

                <div className="info-row">
                  <div className="info-item">
                    <span className="info-label">Age</span>
                    <span className="info-value">{getAge(form.dateOfBirth)}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Date of Birth</span>
                    <input
                      className="admin-input"
                      type="date"
                      value={form.dateOfBirth || ""}
                      onChange={(e) => onInput("dateOfBirth", e.target.value)}
                    />
                  </div>
                </div>

                <div className="info-row">
                  <div className="info-item">
                    <span className="info-label">Gender</span>
                    <input
                      className="admin-input"
                      value={form.gender}
                      onChange={(e) => onInput("gender", e.target.value)}
                    />
                  </div>
                  <div className="info-item">
                    <span className="info-label">Marital Status</span>
                    <input
                      className="admin-input"
                      value={form.maritalStatus}
                      onChange={(e) => onInput("maritalStatus", e.target.value)}
                    />
                  </div>
                </div>

                <div className="info-item">
                  <span className="info-label">Address</span>
                  <input
                    className="admin-input"
                    value={form.address}
                    onChange={(e) => onInput("address", e.target.value)}
                  />
                </div>

                <div className="info-row">
                  <div className="info-item">
                    <span className="info-label">Occupation</span>
                    <input
                      className="admin-input"
                      value={form.occupation}
                      onChange={(e) => onInput("occupation", e.target.value)}
                    />
                  </div>
                  <div className="info-item">
                    <span className="info-label">Company</span>
                    <input
                      className="admin-input"
                      value={form.company}
                      onChange={(e) => onInput("company", e.target.value)}
                    />
                  </div>
                </div>

                <div className="info-item">
                  <span className="info-label">Monthly Income</span>
                  <input
                    className="admin-input"
                    type="number"
                    value={form.monthlyIncome}
                    onChange={(e) => onInput("monthlyIncome", e.target.value)}
                  />
                </div>

                <div className="edit-actions">
                  <button className="btn-pay-now" onClick={onSaveProfile} disabled={saving}>
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="info-card contact-info-card">
            <div className="card-header">
              <h3>Contact Information</h3>
            </div>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Phone Number</span>
                <span className="info-value">{renderValue(user.mobile)}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Email Address</span>
                <span className="info-value">{renderValue(user.email)}</span>
              </div>
              <div className="info-row">
                <div className="info-item">
                  <span className="info-label">Registration Date</span>
                  <span className="info-value">{formatDateTime(user.createdAt)}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Last Seen</span>
                  <span className="info-value">{formatDateTime(user.lastLoginAt)}</span>
                </div>
              </div>
              <div className="info-item">
                <span className="info-label">Account Status</span>
                <span className="info-value">{renderValue(user.kycStatus)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="section-card">
          <div className="section-header">
            <h2>Loan Applications</h2>
          </div>
          <ActiveLoans token={localStorage.getItem("token")} />
        </div>
      </div>
    </>
  );
}

export default UserProfile;
