import { useNavigate } from "react-router-dom";
import "../../styles/Calculator.css";
import Navbar from "../../Components/Navbar/Navbar";

function CalculatorHome() {
  const navigate = useNavigate();

  const tools = [
    {
      title: "EMI Calculator",
      description: "Estimate your monthly EMI using loan amount, tenure, and interest rate.",
      action: "Open EMI",
      route: "/EMICalculator",
    },
    {
      title: "CIBIL Score Check",
      description: "Understand your credit band and loan readiness in one step.",
      action: "Open CIBIL",
      route: "/CibilCalculator",
    },
    {
      title: "Eligibility Calculator",
      description: "Check how much loan amount you may be eligible for based on income.",
      action: "Check Eligibility",
      route: "/EligibilityCalculator",
    },
  ];

  return (
    <div className="calc-page">
      <Navbar noSpacer />

      <section className="calc-hero">
        <div className="calc-hero-content">
          <p className="calc-kicker">Loan Planning Tools</p>
          <h1>Calculator Dashboard</h1>
          <p>
            Use these tools before applying so you can pick a safer EMI and a better tenure.
          </p>
        </div>
      </section>

      <section className="calc-grid-wrap">
        <div className="calc-grid">
          {tools.map((tool) => (
            <article className="calc-card" key={tool.title}>
              <h3>{tool.title}</h3>
              <p>{tool.description}</p>
              <button onClick={() => navigate(tool.route)}>{tool.action}</button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

export default CalculatorHome;



