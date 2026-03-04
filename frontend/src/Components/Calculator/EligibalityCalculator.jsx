import React, { useState } from "react";
import "../../styles/EligibalityCalculator.css";

const EligibilityCalculator = () => {
  const [income, setIncome] = useState("");
  const [eligible, setEligible] = useState(null);
  const [error,setError] = useState("");

  const checkEligibility = () => {
      if(!income){
          setError("Please enter your monthly income");
          setEligible(null);
          return;
          }
      if(income<=0){
          setError("Income must be greater than zero");
          setEligible(null);
          return;
          }
      setError("");
    setEligible(income >= 25000);
  };

  return (
    <div className="eligibility-page">
    <div className="card">
      <h3>Eligibility Check</h3>

      <input placeholder="Monthly Income" onChange={e => setIncome(e.target.value)}/>

      <button onClick={checkEligibility}>Check</button>

      {error && <p className="error-text">{error}</p>}

      {eligible !== null && (<p>{eligible ? "Eligible for Loan ✅" : "Not Eligible ❌"}</p>)}
    </div>
    </div>
  );
};

export default EligibilityCalculator;
