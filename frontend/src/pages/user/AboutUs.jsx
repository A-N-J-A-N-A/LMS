import Navbar from "../../Components/Navbar/Navbar";
import "../../styles/AboutUs.css";

function AboutUs() {
  const featureHighlights = [
    {
      title: "Real-time Application Tracking",
      description:
        "Track every stage from submission to disbursement with status timelines, notifications, and actionable next steps."
    },
    {
      title: "Smart EMI and Repayment Experience",
      description:
        "Plan repayments with flexible calculators, view your complete schedule, and manage prepayment or foreclosure requests."
    },
    {
      title: "Secure Operations and Compliance",
      description:
        "Built with role-based access, KYC workflows, audit logs, and controlled approval pipelines for transparent governance."
    }
  ];

  const stats = [
    { label: "Average Approval Turnaround", value: "12 hrs" },
    { label: "Digital KYC Completion", value: "98.4%" },
    { label: "On-time EMI Collection", value: "96.7%" },
    { label: "Customer Satisfaction", value: "4.8/5" }
  ];

  const workflow = [
    {
      step: "01",
      title: "Apply",
      info: "Customers submit loan applications with guided digital forms and document upload."
    },
    {
      step: "02",
      title: "Verify",
      info: "KYC checks and profile validations are reviewed with admin-assisted decisioning."
    },
    {
      step: "03",
      title: "Disburse",
      info: "Approved loans are disbursed with complete schedule visibility and ledger updates."
    },
    {
      step: "04",
      title: "Manage",
      info: "Borrowers track EMIs, pay online, and request prepayment or foreclosure in-app."
    }
  ];

  return (
    <>
      <Navbar noSpacer />
      <div className="about-page">
        <section className="about-hero about-surface">
          <div className="about-hero-content">
            <span className="about-badge">Loan Lifecycle Platform</span>
            <h1>About CrediFlow</h1>
            <p>
              CrediFlow is a modern Loan Management System designed for lenders
              and borrowers who need speed, transparency, and reliability. From
              application onboarding to repayment closure, every stage is built
              for a real production workflow.
            </p>
            <div className="about-hero-actions">
              <a href="/loans" className="about-primary-btn">
                Explore Loan Products
              </a>
              <a href="/track-status" className="about-secondary-btn">
                Track Your Application
              </a>
            </div>
          </div>
          <div className="about-metric-panel">
            <h3>Platform Snapshot</h3>
            <div className="about-metric-grid">
              {stats.map((item) => (
                <article key={item.label} className="about-metric-card">
                  <p className="about-metric-value">{item.value}</p>
                  <p className="about-metric-label">{item.label}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="about-story about-surface">
          <h2>Why Organizations Use CrediFlow</h2>
          <p>
            Financial operations need more than static dashboards. CrediFlow
            unifies customer onboarding, loan underwriting, disbursement, EMI
            collection, and admin controls into one secure, traceable platform.
          </p>
        </section>

        <section className="about-grid">
          {featureHighlights.map((item) => (
            <article key={item.title} className="about-card">
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </section>

        <section className="about-workflow about-surface">
          <h2>End-to-End Loan Workflow</h2>
          <div className="about-workflow-grid">
            {workflow.map((item) => (
              <article key={item.step} className="about-workflow-card">
                <span className="about-step">{item.step}</span>
                <h3>{item.title}</h3>
                <p>{item.info}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="about-grid about-grid-secondary">
          <article className="about-card">
            <h3>Loan Segments Supported</h3>
            <ul>
              <li>Personal, Home, Education, and Business loans</li>
              <li>Policy-ready interest and tenure configuration</li>
              <li>Eligibility and affordability calculators</li>
            </ul>
          </article>

          <article className="about-card">
            <h3>Governance and Security</h3>
            <ul>
              <li>Role-based user and admin access control</li>
              <li>Auditable approval trails and event analytics</li>
              <li>Payment integrity and document tracking controls</li>
            </ul>
          </article>

          <article className="about-card">
            <h3>Contact and Support</h3>
            <p>Email: support@crediflow.io</p>
            <p>Phone: +1 (800) 555-0147</p>
            <p>Address: 100 Market Street, San Francisco, CA</p>
          </article>
        </section>

        <section className="about-cta about-surface">
          <h2>Build Better Lending Journeys with CrediFlow</h2>
          <p>
            Improve conversion, reduce decision delays, and keep borrowers
            informed at every repayment milestone.
          </p>
          <a href="/register" className="about-primary-btn">
            Create an Account
          </a>
        </section>
      </div>
    </>
  );
}

export default AboutUs;
