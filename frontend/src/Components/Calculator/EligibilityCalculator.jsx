import React, { useMemo, useState } from "react";
import "../../styles/EmiCalculator.css";
import "../../styles/EligibilityCalculator.css";
import Navbar from "../Navbar/Navbar";
import { useNavigate } from "react-router-dom";

const EligibilityCalculator = () => {
  const navigate = useNavigate();
  const [income, setIncome] = useState("");
  const [eligible, setEligible] = useState(null);
  const [error, setError] = useState("");
  const [loanCap, setLoanCap] = useState(0);

  const checkEligibility = () => {
    if (!income) {
      setError("Please enter your monthly income");
      setEligible(null);
      setLoanCap(0);
      return;
    }
    if (Number(income) <= 0) {
      setError("Income must be greater than zero");
      setEligible(null);
      setLoanCap(0);
      return;
    }

    setError("");
    const numericIncome = Number(income);
    const canApply = numericIncome >= 25000;
    setEligible(canApply);
    setLoanCap(Math.round(numericIncome * 35));
  };

  const ratio = useMemo(() => {
    if (!income || Number(income) <= 0) return 0;
    return Math.max(0, Math.min(100, (Number(income) / 25000) * 100));
  }, [income]);

  return (
    <div>
      <Navbar noSpacer />
      <div className="calc-tool-page eligibility-theme">
        <div className="calc-tool-shell">
          <button className="calc-back-link" onClick={() => navigate("/CalculatorHome")}>
            Back to Calculator Home
          </button>

          <div className="calc-tool-header">
            <p className="kicker">Borrowing Capacity Checker</p>
            <h2>Eligibility Calculator</h2>
            <p>Evaluate loan eligibility and estimated borrowing limit from monthly income.</p>
          </div>

          <div className="calc-tool-card">
            <div className="calc-form-grid single">
              <div className="field-block">
                <input
                  type="number"
                  placeholder="Monthly Income"
                  value={income}
                  onChange={(e) => setIncome(e.target.value)}
                />
                <div className="range-wrap">
                  <input
                    type="range"
                    min="5000"
                    max="300000"
                    step="1000"
                    value={income || 25000}
                    onChange={(e) => setIncome(e.target.value)}
                  />
                  <span>Rs {(Number(income || 25000)).toLocaleString("en-IN")}</span>
                </div>
              </div>
              <button onClick={checkEligibility}>Check Eligibility</button>
            </div>

            {error && <p className="error-text">{error}</p>}

            {eligible !== null && (
              <div className="elig-result show">
                <div className="result-head">
                  <strong>{eligible ? "Eligible" : "Not Eligible"}</strong>
                  <span>Estimated Limit: Rs {loanCap.toLocaleString("en-IN")}</span>
                </div>

                <div className="bar-chart">
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${ratio}%` }} />
                  </div>
                  <div className="bar-caption">
                    <span>Income Readiness</span>
                    <span>{Math.round(ratio)}%</span>
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

export default EligibilityCalculator;


