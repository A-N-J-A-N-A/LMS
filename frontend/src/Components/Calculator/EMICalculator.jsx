import React, { useEffect, useMemo, useRef, useState } from "react";
import "../../styles/EmiCalculator.css";
import Navbar from "../Navbar/Navbar";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { getAllLoans } from "../../services/loanService";

const CUSTOM_LOAN_ID = "__CUSTOM__";

function EMICalculator() {
  const navigate = useNavigate();

  const [loanOptions, setLoanOptions] = useState([]);
  const [selectedLoanId, setSelectedLoanId] = useState("");

  // controlled inputs (strings)
  const [principal, setPrincipal] = useState("");
  const [rate, setRate] = useState("");
  const [tenure, setTenure] = useState("");
  const isCustomMode = selectedLoanId === CUSTOM_LOAN_ID;

  const [ranges, setRanges] = useState({
    principalMin: 10000,
    principalMax: 10000000,
    principalStep: 1000,
    tenureMin: 6,
    tenureMax: 360,
    tenureStep: 1,
  });

  const [emi, setEmi] = useState(null);
  const [animatedEmi, setAnimatedEmi] = useState(null);
  const [breakup, setBreakup] = useState(null);
  const [error, setError] = useState("");

  const animRef = useRef(null);

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  /**
   * Handles cases like:
   * - "50000" (string)
   * - 50000 (number)
   * - null/undefined
   * - Mongo-style: { $numberInt: "50000" } or { $numberLong: "50000" }
   */
  const safeNumber = (val, fallback) => {
    if (val === null || val === undefined) return fallback;

    // Mongo extended JSON formats (if any)
    if (typeof val === "object") {
      const maybe =
        val.$numberInt ??
        val.$numberLong ??
        val.$numberDouble ??
        val.number ??
        val.value;
      if (maybe !== undefined) {
        const n = Number(maybe);
        return Number.isFinite(n) ? n : fallback;
      }
    }

    const n = Number(val);
    return Number.isFinite(n) ? n : fallback;
  };

  // derived numeric values always within range (for slider + calculation)
  const principalNum = useMemo(() => {
    const n = Number(principal);
    if (!Number.isFinite(n)) return ranges.principalMin;
    return clamp(n, ranges.principalMin, ranges.principalMax);
  }, [principal, ranges]);

  const tenureNum = useMemo(() => {
    const n = Number(tenure);
    if (!Number.isFinite(n)) return ranges.tenureMin;
    return clamp(n, ranges.tenureMin, ranges.tenureMax);
  }, [tenure, ranges]);

  useEffect(() => {
    const fetchLoans = async () => {
      try {
        setError("");
        const response = await getAllLoans();
        const loans = Array.isArray(response.data) ? response.data : [];
        setLoanOptions(loans);
        setSelectedLoanId(CUSTOM_LOAN_ID);
      } catch (e) {
        setError("Failed to load loan options");
      }
    };

    fetchLoans();
  }, []);

  useEffect(() => {
    const applyRangesAndClampInputs = ({
      principalMin,
      principalMax,
      tenureMin,
      tenureMax,
      principalStep = 1000,
      tenureStep = 1,
    }) => {
      setRanges({
        principalMin,
        principalMax,
        principalStep,
        tenureMin,
        tenureMax,
        tenureStep,
      });

      // clamp currently typed values into new ranges (or default to min)
      setPrincipal((prev) => {
        const n = Number(prev);
        if (!prev || !Number.isFinite(n)) return String(principalMin);
        return String(clamp(n, principalMin, principalMax));
      });

      setTenure((prev) => {
        const n = Number(prev);
        if (!prev || !Number.isFinite(n)) return String(tenureMin);
        return String(clamp(n, tenureMin, tenureMax));
      });
    };

    const fetchSelectedLoanConfig = async () => {
      if (!selectedLoanId) return;
      if (selectedLoanId === CUSTOM_LOAN_ID) {
        applyRangesAndClampInputs({
          principalMin: 1000,
          principalMax: 100000000,
          tenureMin: 1,
          tenureMax: 480,
          principalStep: 1000,
          tenureStep: 1,
        });
        setRate((prev) => (prev ? prev : "10"));
        return;
      }

      try {
        setError("");

        // 1) Try to get min/max directly from the selected loan option (fast + reliable if backend sends it)
        const selected = loanOptions.find((l) => String(l.id) === String(selectedLoanId));

        // If your getAllLoans already returns config fields, use them immediately:
        const optPrincipalMin = safeNumber(selected?.minAmount, NaN);
        const optPrincipalMax = safeNumber(selected?.maxAmount, NaN);
        const optTenureMin = safeNumber(selected?.minTenure, NaN);
        const optTenureMax = safeNumber(selected?.maxTenure, NaN);

        const hasOptionRanges =
          Number.isFinite(optPrincipalMin) &&
          Number.isFinite(optPrincipalMax) &&
          Number.isFinite(optTenureMin) &&
          Number.isFinite(optTenureMax);

        // Fetch selected loan details by loan id.
        const loanRes = await api.get(`/loans/${selectedLoanId}`);
        const loanDetails = loanRes.data || {};
        const interestRate = safeNumber(loanDetails.interestRate, 0);

        if (interestRate > 0) {
          setRate(String(interestRate));
        } else {
          setRate((prev) => (prev ? prev : "10"));
        }

        if (hasOptionRanges) {
          // Apply from dropdown object (no extra API call)
          applyRangesAndClampInputs({
            principalMin: optPrincipalMin,
            principalMax: optPrincipalMax,
            tenureMin: optTenureMin,
            tenureMax: optTenureMax,
            principalStep: 1000,
            tenureStep: 1,
          });
          return;
        }

        // Fallback to ranges from selected loan details payload.
        const principalMin = safeNumber(loanDetails.minAmount, 10000);
        const principalMax = safeNumber(loanDetails.maxAmount, 10000000);
        const tenureMin = safeNumber(loanDetails.minTenure, 6);
        const tenureMax = safeNumber(loanDetails.maxTenure, 360);

        applyRangesAndClampInputs({
          principalMin,
          principalMax,
          tenureMin,
          tenureMax,
          principalStep: 1000,
          tenureStep: 1,
        });
      } catch (e) {
        setError("Failed to load selected loan configuration");
      }
    };

    fetchSelectedLoanConfig();
  }, [selectedLoanId, loanOptions]); // NOTE: includes loanOptions so option-config works

  const calculateEMI = () => {
    const P = principalNum;
    const N = tenureNum;
    const rateNum = Number(rate);

    if (!Number.isFinite(P) || !Number.isFinite(N) || !Number.isFinite(rateNum)) {
      setError("Please fill all required fields");
      setEmi(null);
      setBreakup(null);
      return;
    }

    if (P <= 0 || rateNum <= 0 || N <= 0) {
      setError("Values must be greater than zero");
      setEmi(null);
      setBreakup(null);
      return;
    }

    setError("");

    const R = rateNum / (12 * 100);
    const E = (P * R * Math.pow(1 + R, N)) / (Math.pow(1 + R, N) - 1);
    const totalPayment = E * N;
    const interestAmount = totalPayment - P;

    setEmi(E.toFixed(2));
    setBreakup({
      principal: P,
      totalPayment,
      interestAmount,
    });

    cancelAnimationFrame(animRef.current);
    const target = Number(E);
    const duration = 850;
    const start = performance.now();
    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const value = target * easeOutCubic(progress);
      setAnimatedEmi(value.toFixed(2));
      if (progress < 1) animRef.current = requestAnimationFrame(step);
    };

    animRef.current = requestAnimationFrame(step);
  };

  useEffect(() => () => cancelAnimationFrame(animRef.current), []);

  const interestPercent = useMemo(() => {
    if (!breakup?.totalPayment) return 0;
    return Math.round((breakup.interestAmount / breakup.totalPayment) * 100);
  }, [breakup]);

  return (
    <div>
      <Navbar noSpacer />

      <div className="calc-tool-page emi-theme">
        <div className="calc-tool-shell">
          <button className="calc-back-link" onClick={() => navigate("/CalculatorHome")}>
            Back to Calculator Home
          </button>

          <div className="calc-tool-header">
            <p className="kicker">Finance Planning Tool</p>
            <h2>EMI Calculator</h2>
            <p>Estimate monthly installment and loan repayment split in one view.</p>
          </div>

          <div className="calc-tool-card">
            <div className="calc-form-grid">
              <div className="field-block">
                <label className="calc-field-label">Loan Type</label>
                <select value={selectedLoanId} onChange={(e) => setSelectedLoanId(e.target.value)}>
                  <option value={CUSTOM_LOAN_ID}>Flexible (Custom)</option>
                  {loanOptions.length > 0 && (
                    loanOptions.map((loan) => (
                      <option key={loan.id} value={String(loan.id)}>
                        {loan.name || loan.loanTypeId || `Loan ${loan.id}`}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="field-block">
                <label className="calc-field-label">Rate of Interest (%)</label>
                <input
                  type="number"
                  placeholder="Rate of Interest (%)"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  readOnly={!isCustomMode}
                />
              </div>

              <div className="field-block">
                <label className="calc-field-label">Loan Amount</label>
                <input
                  type="number"
                  placeholder="Principal"
                  value={principal}
                  min={ranges.principalMin}
                  max={ranges.principalMax}
                  onChange={(e) => setPrincipal(e.target.value)}
                  onBlur={() => setPrincipal(String(principalNum))}
                />

                <div className="range-wrap">
                  <input
                    type="range"
                    min={ranges.principalMin}
                    max={ranges.principalMax}
                    step={ranges.principalStep}
                    value={principalNum}
                    onChange={(e) => setPrincipal(e.target.value)}
                  />
                  <span>Rs {principalNum.toLocaleString("en-IN")}</span>
                </div>
              </div>

              <div className="field-block">
                <label className="calc-field-label">Tenure (Months)</label>
                <input
                  type="number"
                  placeholder="Tenure (months)"
                  value={tenure}
                  min={ranges.tenureMin}
                  max={ranges.tenureMax}
                  onChange={(e) => setTenure(e.target.value)}
                  onBlur={() => setTenure(String(tenureNum))}
                />

                <div className="range-wrap">
                  <input
                    type="range"
                    min={ranges.tenureMin}
                    max={ranges.tenureMax}
                    step={ranges.tenureStep}
                    value={tenureNum}
                    onChange={(e) => setTenure(e.target.value)}
                  />
                  <span>{tenureNum} months</span>
                </div>
              </div>

              <button onClick={calculateEMI}>Calculate EMI</button>
            </div>

            {error && <p className="error-text">{error}</p>}

            {emi && (
              <div className="calc-result show" aria-live="polite">
                <div className="result-value">
                  <span>Monthly EMI</span>
                  <strong>
                    Rs {animatedEmi !== null ? animatedEmi : Number(emi).toFixed(2)}
                  </strong>
                </div>

                {breakup && (
                  <div className="chart-wrap">
                    <div
                      className="donut-chart"
                      style={{
                        background: `conic-gradient(#2f4b86 0% ${interestPercent}%, #78a6ff ${interestPercent}% 100%)`,
                      }}
                    >
                      <div className="donut-center">{interestPercent}%</div>
                    </div>

                    <div className="legend">
                      <p>
                        <span className="dot interest" /> Interest: Rs{" "}
                        {breakup.interestAmount.toFixed(2)}
                      </p>
                      <p>
                        <span className="dot principal" /> Principal: Rs{" "}
                        {breakup.principal.toFixed(2)}
                      </p>
                      <p>
                        <span className="dot total" /> Total: Rs{" "}
                        {breakup.totalPayment.toFixed(2)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default EMICalculator;


