import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "../../Components/Navbar/Navbar";
import "../../styles/PaymentPage.css";
import api from "../../services/api";
import {
  createForeclosureRequest,
  createPrepaymentRequest,
  getForeclosureQuote,
  getLoanApplicationDetails,
  getMyForeclosureRequests,
  getMyPrepaymentRequests,
  payForeclosure,
  payInstallment,
  getUserApplications,
} from "../../services/loanService";

function PaymentPage() {
  const PENDING_CHECKOUT_KEY = "pendingStripeCheckout";
  const navigate = useNavigate();
  const location = useLocation();

  const [step, setStep] = useState("confirm");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [applicationId, setApplicationId] = useState("");
  // eslint-disable-next-line no-unused-vars
  const [accountOptions, setAccountOptions] = useState([]);
  const [nextInstallment, setNextInstallment] = useState(null);
  const [prepaymentAmount, setPrepaymentAmount] = useState("");
  const [prepaymentReason, setPrepaymentReason] = useState("");
  const [prepaymentSubmitting, setPrepaymentSubmitting] = useState(false);
  const [prepaymentError, setPrepaymentError] = useState("");
  const [prepaymentMessage, setPrepaymentMessage] = useState("");
  const [prepaymentRequests, setPrepaymentRequests] = useState([]);
  const [redirecting, setRedirecting] = useState(false);
  const [finalizingCheckout, setFinalizingCheckout] = useState(false);
  const [pendingSecondsLeft, setPendingSecondsLeft] = useState(0);
  const [emiEligibility, setEmiEligibility] = useState({
    eligible: true,
    message: "",
  });
  const [walletBalance, setWalletBalance] = useState(0);
  const [walletPaying, setWalletPaying] = useState(false);
  const [lastPaidAmount, setLastPaidAmount] = useState(0);
  const [foreclosureQuote, setForeclosureQuote] = useState(null);
  const [foreclosureAmount, setForeclosureAmount] = useState("");
  const [foreclosureUseWallet, setForeclosureUseWallet] = useState(false);
  const [foreclosureSubmitting, setForeclosureSubmitting] = useState(false);
  const [foreclosureResult, setForeclosureResult] = useState(null);
  const [foreclosureRequests, setForeclosureRequests] = useState([]);
  const [foreclosureReason, setForeclosureReason] = useState("");
  const [foreclosureRequestSubmitting, setForeclosureRequestSubmitting] = useState(false);

  const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const action = (queryParams.get("action") || "").toLowerCase();
  const checkoutStatus = (queryParams.get("status") || "").toLowerCase();
  const checkoutSessionId = queryParams.get("session_id") || "";

  const getPendingCheckout = () => {
    try {
      const raw = localStorage.getItem(PENDING_CHECKOUT_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (_err) {
      return null;
    }
  };

  const setPendingCheckout = (value) => {
    localStorage.setItem(PENDING_CHECKOUT_KEY, JSON.stringify(value));
  };

  const clearPendingCheckout = () => {
    localStorage.removeItem(PENDING_CHECKOUT_KEY);
  };

  useEffect(() => {
    const loadMyPrepaymentRequests = async (loanId) => {
      if (!loanId) return;
      try {
        const res = await getMyPrepaymentRequests(loanId);
        setPrepaymentRequests(Array.isArray(res.data) ? res.data : []);
      } catch (e) {
        console.error("Failed to load prepayment requests", e);
      }
    };

    const loadEmiEligibility = async (loanId) => {
      if (!loanId) {
        setEmiEligibility({ eligible: false, message: "Loan application not found." });
        return { eligible: false, message: "Loan application not found." };
      }
      try {
        const res = await api.get("/payments/emi-eligibility", {
          params: { applicationId: loanId },
        });
        const eligible = Boolean(res?.data?.eligible);
        const message = res?.data?.message || "";
        const result = { eligible, message };
        setEmiEligibility(result);
        return result;
      } catch (err) {
        const message =
          err.response?.data?.message || "Unable to verify EMI payment eligibility right now.";
        const result = { eligible: false, message };
        setEmiEligibility(result);
        return result;
      }
    };

    const loadPaymentData = async () => {
      setLoading(true);
      setError("");

      try {
        const idFromQuery = queryParams.get("applicationId");
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
        const schedule = Array.isArray(details.repaymentSchedule) ? details.repaymentSchedule : [];
        const upcoming =
          schedule.find((item) => (item.status || "").toLowerCase() !== "paid") || null;
        const profileRes = await api.get("/user/profile");
        const currentWalletBalance = Number(profileRes?.data?.walletBalance || 0);

        setApplicationId(selectedId);
        localStorage.setItem("lastApplicationId", selectedId);
        setNextInstallment(upcoming);
        setWalletBalance(currentWalletBalance);
        await loadMyPrepaymentRequests(selectedId);
        const foreclosureRes = await getMyForeclosureRequests(selectedId);
        setForeclosureRequests(Array.isArray(foreclosureRes.data) ? foreclosureRes.data : []);
        await loadEmiEligibility(selectedId);
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.message || "Failed to load payment details. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    loadPaymentData();
  }, [queryParams, location.state]);

  useEffect(() => {
    const finalizeCheckout = async () => {
      if (checkoutStatus !== "success" || !checkoutSessionId) {
        return;
      }
      try {
        const pending = getPendingCheckout();
        const pendingType = String(pending?.paymentType || "").toLowerCase();
        setFinalizingCheckout(true);
        setStep("processing");
        if (pendingType === "foreclosure" || action === "foreclosure") {
          const res = await api.post("/payments/stripe/finalize-foreclosure-checkout", {
            sessionId: checkoutSessionId,
          });
          setForeclosureResult(res?.data || null);
          setWalletBalance(Number(res?.data?.walletBalanceAfter ?? walletBalance));
          setLastPaidAmount(Number(res?.data?.amountPaid || pending?.amount || 0));
        } else {
          await api.post("/payments/stripe/finalize-checkout", {
            sessionId: checkoutSessionId,
          });
          setLastPaidAmount(Number(pending?.amount || 0));
        }
        clearPendingCheckout();
        setStep("success");
      } catch (err) {
        const message = err.response?.data?.message || "Stripe payment verification failed.";
        const normalized = message.toLowerCase();
        if (normalized.includes("already recorded") || normalized.includes("duplicate payment request")) {
          clearPendingCheckout();
          setStep("success");
        } else {
          setStep("confirm");
          setError(message);
        }
      } finally {
        setFinalizingCheckout(false);
      }
    };

    finalizeCheckout();
  }, [action, checkoutStatus, checkoutSessionId, walletBalance]);

  useEffect(() => {
    const markFailed = async (sessionId, reason, message) => {
      if (!sessionId) return;
      try {
        await api.post("/payments/stripe/mark-failed", { sessionId, reason });
      } catch (_err) {
        // Ignore UI-side failure; scheduler will also mark expired pending payments.
      } finally {
        clearPendingCheckout();
        if (message) {
          setError(message);
        }
      }
    };

    if (!["pay", "foreclosure"].includes(action)) return;

    const pending = getPendingCheckout();
    const pendingType = String(pending?.paymentType || "").toLowerCase();

    // Foreclosure checkout does not use pending-EMI timeout failure handling.
    if (pendingType === "foreclosure") {
      return;
    }

    if (checkoutStatus === "cancelled") {
      setError("");
      markFailed(pending?.sessionId, "USER_CANCELLED");
      return;
    }

    if (checkoutStatus === "success") return;

    if (!pending?.sessionId || !pending?.createdAt) return;

    const elapsedSec = Math.floor((Date.now() - pending.createdAt) / 1000);
    const totalSec = 30;
    if (elapsedSec >= totalSec) {
      markFailed(
        pending.sessionId,
        "TIMEOUT",
        "Payment processing timed out"
      );
      return;
    }

    setStep("processing");
    setPendingSecondsLeft(totalSec - elapsedSec);
    const timer = setInterval(() => {
      const currentElapsed = Math.floor((Date.now() - pending.createdAt) / 1000);
      const remaining = totalSec - currentElapsed;
      if (remaining <= 0) {
        clearInterval(timer);
        setPendingSecondsLeft(0);
        markFailed(
          pending.sessionId,
          "TIMEOUT",
          "Payment processing timed out"
        );
        setStep("confirm");
        return;
      }
      setPendingSecondsLeft(remaining);
    }, 1000);

    return () => clearInterval(timer);
  }, [action, checkoutStatus]);

  useEffect(() => {
    const loadForeclosureQuote = async () => {
      if (action !== "foreclosure" || !applicationId) return;
      try {
        const res = await getForeclosureQuote(applicationId);
        const quote = res?.data || null;
        setForeclosureQuote(quote);
        setForeclosureAmount(String(Number(quote?.remainingPayable || 0)));
      } catch (err) {
        setError(err.response?.data?.message || "Unable to fetch foreclosure quote.");
      }
    };

    loadForeclosureQuote();
  }, [action, applicationId]);

  const activeApprovedForeclosure = useMemo(
    () =>
      foreclosureRequests.find(
        (request) => request.status === "APPROVED" && !request.consumed
      ) || null,
    [foreclosureRequests]
  );

  const pendingForeclosure = useMemo(
    () =>
      foreclosureRequests.find((request) => request.status === "PENDING") || null,
    [foreclosureRequests]
  );

  useEffect(() => {
    if (!activeApprovedForeclosure) return;
    const approvedAmount = Number(activeApprovedForeclosure.requestedAmount || 0);
    if (!approvedAmount || Number.isNaN(approvedAmount)) return;
    setForeclosureAmount((prev) => {
      const current = Number(prev);
      if (!prev || Number.isNaN(current) || current < approvedAmount) {
        return String(approvedAmount);
      }
      return prev;
    });
  }, [activeApprovedForeclosure]);

  const activeApprovedPrepayment = useMemo(
    () =>
      prepaymentRequests.find(
        (request) => request.status === "APPROVED" && !request.consumed
      ) || null,
    [prepaymentRequests]
  );

  const amount = useMemo(
    () =>
      Number(
        activeApprovedPrepayment?.requestedAmount ||
          nextInstallment?.totalPayment ||
          nextInstallment?.amount ||
          0
      ),
    [activeApprovedPrepayment, nextInstallment]
  );

  const isAlreadyRecordedError = error.toLowerCase().includes("already recorded");
  const alreadyPaidCurrentMonth = (emiEligibility.message || "")
    .toLowerCase()
    .includes("already done for this month");
  const hasPayableInstallment =
    Boolean(nextInstallment?.installmentNo) &&
    (nextInstallment?.status || "").toLowerCase() !== "paid" &&
    !isAlreadyRecordedError &&
    emiEligibility.eligible &&
    amount > 0;
  const canPayFromWallet =
    hasPayableInstallment &&
    walletBalance >= amount;
  const foreclosureMinAllowed = useMemo(() => {
    const remaining = Number(foreclosureQuote?.remainingPayable || 0);
    if (!remaining || Number.isNaN(remaining)) return 0;
    return remaining;
  }, [foreclosureQuote]);
  const foreclosureDisplayAmount = useMemo(() => {
    const approved = Number(activeApprovedForeclosure?.requestedAmount || 0);
    if (approved > 0 && !Number.isNaN(approved)) return approved;
    return Number(foreclosureQuote?.remainingPayable || 0);
  }, [activeApprovedForeclosure, foreclosureQuote]);

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

  const gotoAction = (nextAction) => {
    if (applicationId) {
      navigate(`/payment?applicationId=${applicationId}&action=${nextAction}`);
      return;
    }
    navigate(`/payment?action=${nextAction}`);
  };

  const startStripeCheckout = async () => {
    if (!applicationId || !hasPayableInstallment) {
      setError(
        emiEligibility.eligible
          ? "No payable installment is available right now."
          : emiEligibility.message || "EMI payment is not allowed right now."
      );
      return;
    }
    try {
      setRedirecting(true);
      setError("");
      const eligibilityRes = await api.get("/payments/emi-eligibility", {
        params: { applicationId },
      });
      if (!eligibilityRes?.data?.eligible) {
        setError(eligibilityRes?.data?.message || "EMI payment is not allowed right now.");
        setRedirecting(false);
        return;
      }
      const res = await api.post("/payments/stripe/create-checkout-session", {
        applicationId,
        installmentNo: nextInstallment.installmentNo,
        amount,
        currency: "inr",
      });
      const checkoutUrl = res?.data?.checkoutUrl;
      const sessionId = res?.data?.sessionId;
      if (!checkoutUrl) {
        throw new Error("Stripe checkout URL is missing.");
      }
      if (sessionId) {
        setPendingCheckout({
          sessionId,
          applicationId,
          amount,
          paymentType: "emi",
          createdAt: Date.now(),
        });
      }
      window.location.href = checkoutUrl;
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to start Stripe checkout.");
      setRedirecting(false);
    }
  };

  const startForeclosureStripeCheckout = async () => {
    if (!applicationId || !activeApprovedForeclosure) {
      setError("Foreclosure approval is required before payment.");
      return;
    }
    const amountValue = Number(foreclosureAmount);
    if (!amountValue || Number.isNaN(amountValue)) {
      setError("Enter a valid foreclosure amount.");
      return;
    }
    try {
      setRedirecting(true);
      setError("");
      const res = await api.post("/payments/stripe/create-foreclosure-checkout-session", {
        applicationId,
        amount: amountValue,
        currency: "inr",
      });
      const checkoutUrl = res?.data?.checkoutUrl;
      const sessionId = res?.data?.sessionId;
      if (!checkoutUrl) {
        throw new Error("Stripe checkout URL is missing.");
      }
      if (sessionId) {
        setPendingCheckout({
          sessionId,
          applicationId,
          amount: amountValue,
          paymentType: "foreclosure",
          createdAt: Date.now(),
        });
      }
      window.location.href = checkoutUrl;
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to start Stripe checkout.");
      setRedirecting(false);
    }
  };

  const handleWalletPayment = async () => {
    if (!canPayFromWallet || !applicationId || !nextInstallment?.installmentNo) {
      setError("Wallet balance is not enough for this EMI.");
      return;
    }

    try {
      setWalletPaying(true);
      setError("");
      await payInstallment({
        applicationId,
        installmentNo: nextInstallment.installmentNo,
        amount,
        useWallet: true,
      });
      const profileRes = await api.get("/user/profile");
      setWalletBalance(Number(profileRes?.data?.walletBalance || 0));
      setLastPaidAmount(amount);
      setStep("success");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to pay from wallet right now.");
    } finally {
      setWalletPaying(false);
    }
  };

  const handlePrepaymentRequest = async () => {
    if (!applicationId) {
      setPrepaymentError("Loan application not found for prepayment request");
      return;
    }

    const amountValue = Number(prepaymentAmount);
    if (!amountValue || amountValue <= 0) {
      setPrepaymentError("Enter a valid prepayment amount");
      return;
    }

    try {
      setPrepaymentSubmitting(true);
      setPrepaymentError("");
      setPrepaymentMessage("");

      await createPrepaymentRequest({
        loanApplicationId: applicationId,
        requestedAmount: amountValue,
        reason: prepaymentReason,
      });

      const res = await getMyPrepaymentRequests(applicationId);
      setPrepaymentRequests(Array.isArray(res.data) ? res.data : []);
      setPrepaymentAmount("");
      setPrepaymentReason("");
      setPrepaymentMessage("Prepayment request sent to admin successfully.");
    } catch (err) {
      setPrepaymentError(err.response?.data?.message || "Failed to submit prepayment request");
    } finally {
      setPrepaymentSubmitting(false);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="payment-page">
          <div className="payment-card center">
            <h3>Loading payment details...</h3>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="payment-page">
        {step === "processing" && (
          <div className="payment-card center">
            <div className="loader"></div>
            <h3>{finalizingCheckout ? "Finalizing Payment..." : "Processing Payment..."}</h3>
            {finalizingCheckout ? (
              <p>Please do not refresh this page</p>
            ) : (
              <p>Waiting for payment confirmation... {pendingSecondsLeft}s</p>
            )}
          </div>
        )}

        {step === "success" && (
          <div className="payment-card center">
            <div className="success-circle">OK</div>
            <h2>Payment Successful</h2>
            {!foreclosureResult && <p>{formatAmount(lastPaidAmount || amount)} has been paid successfully.</p>}
            {foreclosureResult && (
              <div className="foreclosure-summary">
                <p>{foreclosureResult.message}</p>
                <p>Paid: {formatAmount(foreclosureResult.amountPaid)}</p>
                <p>Applied to Loan: {formatAmount(foreclosureResult.amountAppliedToLoan)}</p>
                <p>Debited from Wallet: {formatAmount(foreclosureResult.walletDebited)}</p>
                <p>Credited to Wallet: {formatAmount(foreclosureResult.walletCredited)}</p>
                <p>Wallet Balance After: {formatAmount(foreclosureResult.walletBalanceAfter)}</p>
              </div>
            )}
            <button className="btn-success" onClick={() => navigate("/profile")}>
              Back to Dashboard
            </button>
          </div>
        )}

        {step === "confirm" && !action && (
          <div className="payment-card center">
            <h3>Choose Action</h3>
            <p className="payment-subtitle">Application: {applicationId || "-"}</p>
            <div className="payment-actions">
              <button className="btn-primary" onClick={() => gotoAction("pay")}>
                Pay Now
              </button>
              <button className="btn-secondary" onClick={() => gotoAction("prepayment")}>
                Request Loan Prepayment
              </button>
              <button className="btn-secondary" onClick={() => gotoAction("foreclosure")}>
                Foreclose Loan
              </button>
            </div>
          </div>
        )}

        {step === "confirm" && action === "pay" && (
          <div className="payment-card">
            <h4 className="payment-subtitle">Secure Payment</h4>
            <h1 className="payment-amount">{formatAmount(amount)}</h1>
            {activeApprovedPrepayment && (
              <p className="prepayment-applied-note">
                Approved prepayment amount is applied for this installment.
              </p>
            )}
            <p className="payment-subtitle">Wallet Balance: {formatAmount(walletBalance)}</p>
            {applicationId && <p className="payment-subtitle">Application: {applicationId}</p>}
            {nextInstallment?.dueDate && (
              <p className="payment-subtitle">Due Date: {formatDate(nextInstallment.dueDate)}</p>
            )}

            <hr />
            <p className="payment-subtitle">You will be redirected to Stripe secure checkout page.</p>
            {!emiEligibility.eligible && (
              <p className="error-text">
                {emiEligibility.message || "EMI payment is not allowed right now."}
              </p>
            )}
            {alreadyPaidCurrentMonth && (
              <p className="payment-subtitle">
                EMI for this month is already paid. You can request an additional payment approval from admin.
              </p>
            )}
            {!hasPayableInstallment && emiEligibility.eligible && (
              <p className="success-text">Current installment is already paid. Next payment is not available yet.</p>
            )}
            {checkoutStatus === "cancelled" && <p className="error-text">Payment was cancelled.</p>}

            {error && <p className="error-text">{error}</p>}

            <div className="payment-actions">
              <button
                className="btn-primary"
                onClick={startStripeCheckout}
                disabled={redirecting || !hasPayableInstallment}
              >
                {redirecting ? "Redirecting..." : `Pay ${formatAmount(amount)} on Stripe`}
              </button>
              <button
                className="btn-wallet"
                onClick={handleWalletPayment}
                disabled={walletPaying || !canPayFromWallet}
              >
                {walletPaying
                  ? "Processing Wallet Payment..."
                  : `Pay ${formatAmount(amount)} from Wallet`}
              </button>
              <button className="btn-secondary" onClick={() => navigate("/profile")}>
                Back to Profile
              </button>
              {alreadyPaidCurrentMonth && (
                <button
                  className="btn-secondary"
                  onClick={() => {
                    setPrepaymentReason("Requesting additional payment for current month");
                    gotoAction("prepayment");
                  }}
                >
                  Request Extra Payment
                </button>
              )}
            </div>
          </div>
        )}

        {step === "confirm" && action === "prepayment" && (
          <div className="payment-card">
            <h4 className="payment-subtitle">Request Loan Prepayment</h4>
            <h1 className="payment-amount">{formatAmount(amount)}</h1>
            {applicationId && <p className="payment-subtitle">Application: {applicationId}</p>}
            <p className="payment-subtitle">Send prepayment request to admin for approval.</p>

            <div className="input-group">
              <label>Prepayment Amount</label>
              <input
                type="number"
                min="1"
                placeholder="Enter prepayment amount"
                value={prepaymentAmount}
                onChange={(e) => setPrepaymentAmount(e.target.value)}
              />
            </div>

            <div className="input-group">
              <label>Reason (optional)</label>
              <input
                type="text"
                placeholder="Reason for prepayment request"
                value={prepaymentReason}
                onChange={(e) => setPrepaymentReason(e.target.value)}
              />
            </div>

            <div className="payment-actions">
              <button
                className="btn-primary"
                type="button"
                onClick={handlePrepaymentRequest}
                disabled={prepaymentSubmitting}
              >
                {prepaymentSubmitting ? "Submitting..." : "Submit Prepayment Request"}
              </button>
              <button className="btn-secondary" onClick={() => gotoAction("pay")}>
                Switch to Pay Now
              </button>
            </div>

            {prepaymentError && <p className="error-text">{prepaymentError}</p>}
            {prepaymentMessage && <p className="success-text">{prepaymentMessage}</p>}

            {prepaymentRequests.length > 0 && (
              <div className="prepayment-history">
                <h6>My Prepayment Requests</h6>
                <table>
                  <thead>
                    <tr>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Consumed</th>
                      <th>Requested At</th>
                      <th>Admin Comment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prepaymentRequests.map((request) => (
                      <tr key={request.id}>
                        <td>{formatAmount(request.requestedAmount)}</td>
                        <td>
                          <span className={`status-chip ${(request.status || "").toLowerCase()}`}>
                            {request.status}
                          </span>
                        </td>
                        <td>{request.consumed ? "Yes" : "No"}</td>
                        <td>{formatDate(request.requestedAt)}</td>
                        <td>{request.reviewComment || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {step === "confirm" && action === "foreclosure" && (
          <div className="payment-card">
            <h4 className="payment-subtitle">Loan Foreclosure</h4>
            <h1 className="payment-amount">{formatAmount(foreclosureDisplayAmount)}</h1>
            {applicationId && <p className="payment-subtitle">Application: {applicationId}</p>}
            <p className="payment-subtitle">Outstanding Principal: {formatAmount(foreclosureQuote?.outstandingPrincipal || 0)}</p>
            <p className="payment-subtitle">Wallet Balance: {formatAmount(foreclosureQuote?.walletBalance || 0)}</p>
            {pendingForeclosure && (
              <p className="payment-subtitle">Foreclosure request is pending admin approval.</p>
            )}
            {!pendingForeclosure && !activeApprovedForeclosure && (
              <>
                <div className="input-group">
                  <label>Request Amount</label>
                  <input
                    type="number"
                    min={foreclosureMinAllowed}
                    step="0.01"
                    value={foreclosureAmount}
                    onChange={(e) => setForeclosureAmount(e.target.value)}
                  />
                </div>
                <p className="payment-subtitle">
                  Request amount must be at least foreclosure payable amount:
                  {" "}
                  {formatAmount(foreclosureMinAllowed)}
                </p>
                <div className="input-group">
                  <label>Reason (optional)</label>
                  <input
                    type="text"
                    placeholder="Reason for foreclosure request"
                    value={foreclosureReason}
                    onChange={(e) => setForeclosureReason(e.target.value)}
                  />
                </div>
              </>
            )}
            {activeApprovedForeclosure && (
              <>
                <p className="payment-subtitle">
                  Approved Amount: {formatAmount(activeApprovedForeclosure.requestedAmount)}
                </p>
                <div className="input-group">
                  <label>Foreclosure Amount (minimum approved amount)</label>
                  <input
                    type="number"
                    min={Number(activeApprovedForeclosure.requestedAmount || 0)}
                    step="0.01"
                    value={foreclosureAmount}
                    onChange={(e) => setForeclosureAmount(e.target.value)}
                  />
                </div>
                <label className="radio-option">
                  <input
                    type="checkbox"
                    checked={foreclosureUseWallet}
                    onChange={(e) => setForeclosureUseWallet(e.target.checked)}
                  />
                  Pay using wallet balance
                </label>
                <p className="payment-subtitle">
                  If paid amount is higher than foreclosure payable, extra is credited to wallet.
                </p>
              </>
            )}

            {error && <p className="error-text">{error}</p>}

            <div className="payment-actions">
              {!pendingForeclosure && !activeApprovedForeclosure && (
                <button
                  className="btn-primary"
                  onClick={async () => {
                    const amountValue = Number(foreclosureAmount);
                    if (!applicationId || !amountValue || Number.isNaN(amountValue)) {
                      setError("Enter a valid request amount.");
                      return;
                    }
                    if (amountValue < foreclosureMinAllowed) {
                      setError(
                        `Foreclosure request amount must be at least ${formatAmount(
                          foreclosureMinAllowed
                        )}.`
                      );
                      return;
                    }
                    try {
                      setError("");
                      setForeclosureRequestSubmitting(true);
                      await createForeclosureRequest({
                        loanApplicationId: applicationId,
                        requestedAmount: amountValue,
                        reason: foreclosureReason,
                      });
                      const listRes = await getMyForeclosureRequests(applicationId);
                      setForeclosureRequests(Array.isArray(listRes.data) ? listRes.data : []);
                    } catch (err) {
                      setError(err.response?.data?.message || "Unable to submit foreclosure request.");
                    } finally {
                      setForeclosureRequestSubmitting(false);
                    }
                  }}
                  disabled={foreclosureRequestSubmitting}
                >
                  {foreclosureRequestSubmitting ? "Submitting..." : "Submit Foreclosure Request"}
                </button>
              )}
              {activeApprovedForeclosure && (
                <button
                  className="btn-primary"
                  onClick={foreclosureUseWallet ? async () => {
                    const amountValue = Number(foreclosureAmount);
                    if (!applicationId || !amountValue || Number.isNaN(amountValue)) {
                      setError("Enter a valid foreclosure amount.");
                      return;
                    }
                    try {
                      setError("");
                      setForeclosureSubmitting(true);
                      const res = await payForeclosure({
                        applicationId,
                        amount: amountValue,
                        useWallet: foreclosureUseWallet,
                      });
                      setForeclosureResult(res?.data || null);
                      setWalletBalance(Number(res?.data?.walletBalanceAfter ?? walletBalance));
                      setStep("success");
                    } catch (err) {
                      setError(err.response?.data?.message || "Unable to complete foreclosure.");
                    } finally {
                      setForeclosureSubmitting(false);
                    }
                  } : startForeclosureStripeCheckout}
                  disabled={foreclosureSubmitting || redirecting}
                >
                  {foreclosureSubmitting
                    ? "Processing..."
                    : redirecting
                      ? "Redirecting..."
                      : foreclosureUseWallet
                        ? "Pay Foreclosure"
                        : "Pay Foreclosure on Stripe"}
                </button>
              )}
              <button className="btn-secondary" onClick={() => gotoAction("pay")}>
                Back to EMI Payment
              </button>
            </div>

            {foreclosureRequests.length > 0 && (
              <div className="prepayment-history">
                <h6>My Foreclosure Requests</h6>
                <table>
                  <thead>
                    <tr>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Consumed</th>
                      <th>Requested At</th>
                      <th>Admin Comment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {foreclosureRequests.map((request) => (
                      <tr key={request.id}>
                        <td>{formatAmount(request.requestedAmount)}</td>
                        <td>
                          <span className={`status-chip ${(request.status || "").toLowerCase()}`}>
                            {request.status}
                          </span>
                        </td>
                        <td>{request.consumed ? "Yes" : "No"}</td>
                        <td>{formatDate(request.requestedAt)}</td>
                        <td>{request.reviewComment || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

export default PaymentPage;
