import React, { useEffect, useMemo, useState } from "react";
import "../../styles/EmiCalculator.css";
import "../../styles/CibilCalculator.css";
import Navbar from "../Navbar/Navbar";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const resolveUserBonus = (rawUserId) => {
  const numericDirect = Number(rawUserId);
  if (Number.isFinite(numericDirect)) return numericDirect % 100;

  const text = String(rawUserId || "").trim();
  if (!text) return 0;

  const digits = text.replace(/\D/g, "");
  if (!digits) return 0;
  return Number(digits.slice(-6)) % 100;
};

const getRisk = (score) => {
  if (score < 550) return { label: "High Risk", color: "#dc2626" };
  if (score < 700) return { label: "Medium Risk", color: "#d97706" };
  return { label: "Low Risk", color: "#16a34a" };
};

const CibilCalculator = ({ salary = "", loanAmount = "", userId = "" }) => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const isLoggedIn = Boolean(token);
  const [salaryInput, setSalaryInput] = useState(salary || 50000);
  const [loanAmountInput, setLoanAmountInput] = useState(loanAmount || 500000);
  const [resolvedUserId, setResolvedUserId] = useState(userId || "");
  const [score, setScore] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoggedIn) {
      setResolvedUserId("");
      return;
    }

    let active = true;
    const fallbackId = userId || "";

    const loadUserId = async () => {
      try {
        const res = await api.get("/user/profile");
        if (!active) return;

        const profile = res.data || {};
        const customerId = profile.userId || profile.customerId || profile.id || fallbackId;
        setResolvedUserId(customerId || "");
      } catch {
        if (active) setResolvedUserId(fallbackId);
      }
    };

    loadUserId();
    return () => {
      active = false;
    };
  }, [isLoggedIn, userId]);

  const calculateScore = () => {
    const salaryValue = Number(salaryInput);
    const loanValue = Number(loanAmountInput);

    if (!salaryValue || !loanValue) {
      setError("Please enter salary and loan amount.");
      setScore(null);
      return;
    }

    let calculated = 600;

    if (salaryValue > 50000) calculated += 50;
    if (loanValue < 500000) calculated += 40;
    else calculated -= 30;

    calculated += resolveUserBonus(resolvedUserId);
    setScore(clamp(calculated, 300, 900));
    setError("");
  };

  const risk = useMemo(() => (score ? getRisk(score) : null), [score]);
  const scorePercent = useMemo(() => {
    if (!score) return 0;
    return Math.max(0, Math.min(100, ((score - 300) / (900 - 300)) * 100));
  }, [score]);

  return (
    <div>
      <Navbar noSpacer />
      <div className="calc-tool-page cibil-theme">
        <div className="calc-tool-shell">
          <button className="calc-back-link" onClick={() => navigate("/CalculatorHome")}>
            Back to Calculator Home
          </button>

          <div className="calc-tool-header">
            <p className="kicker">Credit Health Monitor</p>
            <h2>CIBIL Score Check</h2>
            <p>Estimate your internal credit score using salary, loan amount, and user profile.</p>
          </div>

          <div className="calc-tool-card">
            <div className="cibil-input-grid">
              <div className="field-block">
                <label htmlFor="salaryInput">Monthly Salary</label>
                <input
                  id="salaryInput"
                  type="number"
                  min="5000"
                  step="1000"
                  value={salaryInput}
                  onChange={(e) => setSalaryInput(e.target.value)}
                  placeholder="Enter salary"
                />
              </div>

              <div className="range-wrap">
                <input
                  type="range"
                  min="5000"
                  max="500000"
                  step="1000"
                  value={salaryInput || 5000}
                  onChange={(e) => setSalaryInput(e.target.value)}
                />
                <span>Rs {Number(salaryInput || 0).toLocaleString()}</span>
              </div>

              <div className="field-block">
                <label htmlFor="loanAmountInput">Loan Amount</label>
                <input
                  id="loanAmountInput"
                  type="number"
                  min="10000"
                  step="1000"
                  value={loanAmountInput}
                  onChange={(e) => setLoanAmountInput(e.target.value)}
                  placeholder="Enter loan amount"
                />
              </div>

              <div className="range-wrap">
                <input
                  type="range"
                  min="10000"
                  max="10000000"
                  step="1000"
                  value={loanAmountInput || 10000}
                  onChange={(e) => setLoanAmountInput(e.target.value)}
                />
                <span>Rs {Number(loanAmountInput || 0).toLocaleString()}</span>
              </div>
            </div>

            {isLoggedIn && (
              <div className="customer-id-chip">
                Customer ID: <strong>{resolvedUserId || "Loading..."}</strong>
              </div>
            )}

            <button className="primary-cta" onClick={calculateScore}>
              Check CIBIL
            </button>

            {error && <p className="error-text">{error}</p>}

            {score && (
              <div className="cibil-result show">
                <div className="score-main">
                  <span>Credit Score</span>
                  <strong>{score}</strong>
                  <em style={{ color: risk.color }}>{risk.label}</em>
                </div>

                <div className="gauge-wrap">
                  <div className="gauge-track">
                    <div className="gauge-fill" style={{ width: `${scorePercent}%`, backgroundColor: risk.color }} />
                  </div>
                  <div className="gauge-labels">
                    <span>300</span>
                    <span>900</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CibilCalculator;


