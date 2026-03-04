import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import api from "../../services/api";
import Navbar from "../../Components/Navbar/Navbar";
import "../../styles/LoanDetails.css";

const sectionsConfig = [
  { id: "emi", label: "EMI Calculator" },
  { id: "documents", label: "Documents" },
  { id: "eligibility", label: "Eligibility" },
  { id: "other-details", label: "Other Details" },
  { id: "faqs", label: "FAQs" },
];

const formatKey = (key) =>
  String(key || "")
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/^./, (c) => c.toUpperCase());

export default function LoanDetails() {
  const { loanTypeId } = useParams();
  const [loan, setLoan] = useState(null);
  const [loanTypeConfig, setLoanTypeConfig] = useState(null);
  const [commonKyc, setCommonKyc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [interestRate, setInterestRate] = useState("");
  const [activeId, setActiveId] = useState(sectionsConfig[0].id);
  const [topNavH, setTopNavH] = useState(56);
  const [pageEntered, setPageEntered] = useState(false);

  const sectionRefs = useRef({});
  const stickyNavRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fetchLoan = async () => {
      try {
        const [infoRes, typeRes] = await Promise.allSettled([
          api.get(`/loans/info/${loanTypeId}`),
          api.get(`/loans/${loanTypeId}`),
        ]);

        if (infoRes.status === "fulfilled") {
          setLoan(infoRes.value?.data?.loanDetails || null);
          setCommonKyc(infoRes.value?.data?.commonKyc || null);
        } else {
          setLoan(null);
          setCommonKyc(null);
        }

        if (typeRes.status === "fulfilled") {
          setLoanTypeConfig(typeRes.value?.data || null);
        } else {
          setLoanTypeConfig(null);
        }
      } catch (err) {
        console.error("Failed to fetch loan", err);
      } finally {
        setLoading(false);
      }
    };
    if (loanTypeId) fetchLoan();
  }, [loanTypeId]);

  useEffect(() => {
    const fetchInterestRate = async () => {
      try {
        const res = await api.get(`/loans/${loanTypeId}`);
        setInterestRate(String(res.data.interestRate || ""));
      } catch (err) {
        console.error("Failed to fetch interest rate", err);
      }
    };
    if (loanTypeId) fetchInterestRate();
  }, [loanTypeId]);

  useEffect(() => {
    const update = () => {
      const nav = document.querySelector(".navbar");
      const h = nav ? nav.offsetHeight : 56;
      setTopNavH(h);
      document.documentElement.style.setProperty("--top-nav-height", `${h}px`);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    const stickyH = stickyNavRef.current?.offsetHeight || 0;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        });
      },
      { rootMargin: `-${topNavH + stickyH}px 0px -60% 0px` }
    );

    sectionsConfig.forEach(({ id }) => {
      const el = sectionRefs.current[id];
      if (el) io.observe(el);
    });

    return () => io.disconnect();
  }, [topNavH]);

  useEffect(() => {
    const id = location.hash.replace("#", "");
    const el = sectionRefs.current[id];
    if (!el) return;
    const stickyH = stickyNavRef.current?.offsetHeight || 0;
    const y = el.getBoundingClientRect().top + window.pageYOffset - topNavH - stickyH;
    window.scrollTo({ top: y, behavior: "smooth" });
    setActiveId(id);
  }, [location.hash, topNavH]);

  useEffect(() => {
    setPageEntered(false);
    const raf = window.requestAnimationFrame(() => setPageEntered(true));
    return () => window.cancelAnimationFrame(raf);
  }, [loanTypeId]);

  useEffect(() => {
    const targets = Array.from(document.querySelectorAll(".reveal-on-scroll"));
    if (!targets.length) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      targets.forEach((el) => el.classList.add("revealed"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -12% 0px" }
    );

    targets.forEach((el, i) => {
      el.classList.remove("revealed");
      if (!el.style.getPropertyValue("--reveal-delay")) {
        el.style.setProperty("--reveal-delay", `${Math.min(i * 60, 240)}ms`);
      }
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, [loading, loanTypeId]);

  const handleApplyNow = () => {
    const token = localStorage.getItem("token");
    if (token) navigate(`/loan-apply/${loanTypeId}`);
    else navigate("/login", { state: { redirectTo: `/loan-apply/${loanTypeId}` } });
  };

  const mergedDocuments = useMemo(() => {
    const loanData = loan || {};
    const docs = [];
    if (commonKyc) {
      docs.push(...(commonKyc.identityProof || []));
      docs.push(...(commonKyc.addressProof || []));
      docs.push(...(commonKyc.personalDetails || []));
      docs.push(...(commonKyc.creditConsent || []));
      Object.values(commonKyc.incomeAndEmploymentProof || {}).forEach((arr) => docs.push(...arr));
    }
    if (loanData.documentsRequired) {
      Object.values(loanData.documentsRequired).forEach((arr) => docs.push(...arr));
    }
    return [...new Set(docs)];
  }, [loan, commonKyc]);

  if (loading) return <p style={{ padding: 40 }}>Loading...</p>;
  if (!loan && !loanTypeConfig) return <p style={{ padding: 40 }}>Loan not found.</p>;

  const loanData = loan || {};

  return (
    <>
      <Navbar />
      <main className={`loan-details-page page-enter ${pageEntered ? "is-entered" : ""}`}>
        <div className="section-nav-wrap reveal-on-scroll" ref={stickyNavRef}>
          <nav className="section-nav">
            {sectionsConfig.map(({ id, label }) => (
              <a
                key={id}
                href={`#${id}`}
                className={activeId === id ? "active" : ""}
                onClick={(e) => {
                  e.preventDefault();
                  const el = sectionRefs.current[id];
                  if (!el) return;
                  const stickyH = stickyNavRef.current?.offsetHeight || 0;
                  const y = el.getBoundingClientRect().top + window.pageYOffset - topNavH - stickyH;
                  window.scrollTo({ top: y, behavior: "smooth" });
                  setActiveId(id);
                  navigate(`#${id}`, { replace: true });
                }}
              >
                {label}
              </a>
            ))}
          </nav>
        </div>

        <section className="loan-hero reveal-on-scroll">
          <div className="loan-hero-main">
            <p className="hero-kicker">Loan Product Profile</p>
            <h1>{loan?.loanTypeId?.replaceAll("_", " ") || loanTypeConfig?.name || "Loan"}</h1>
            <p className="hero-short">{loanData.shortDescription || "-"}</p>
            <p className="hero-long">{loanData.longDescription || "-"}</p>
            <button className="primary-btn" onClick={handleApplyNow}>
              Apply Now
            </button>
          </div>
          <div className="loan-hero-metrics">
            <div className="metric-item">
              <span>Interest Rate</span>
              <strong>{interestRate ? `${interestRate}%` : "-"}</strong>
            </div>
            <div className="metric-item">
              <span>Amount Range</span>
              <strong>
                {loanTypeConfig?.minAmount ?? "-"} - {loanTypeConfig?.maxAmount ?? "-"}
              </strong>
            </div>
            <div className="metric-item">
              <span>Tenure</span>
              <strong>
                {loanTypeConfig?.minTenure ?? "-"} to {loanTypeConfig?.maxTenure ?? "-"} months
              </strong>
            </div>
          </div>
        </section>

        <section
          id="emi"
          className="details-section reveal-on-scroll"
          ref={(n) => (sectionRefs.current.emi = n)}
        >
          <h2>EMI Calculator</h2>
          <p className="section-note">Estimate your monthly repayment using the configured interest rate.</p>
          <EmiCalculator interestRate={interestRate} />
        </section>

        <section
          id="documents"
          className="details-section reveal-on-scroll"
          ref={(n) => (sectionRefs.current.documents = n)}
        >
          <h2>Documents Required</h2>
          <div className="bullet-grid">
            {mergedDocuments.map((doc, i) => (
              <div key={i} className="bullet-item">
                {doc}
              </div>
            ))}
          </div>
        </section>

        <section
          id="eligibility"
          className="details-section reveal-on-scroll"
          ref={(n) => (sectionRefs.current.eligibility = n)}
        >
          <h2>Eligibility</h2>
          <div className="kv-grid">
            {Object.entries(loanData.eligibility || {}).map(([k, v]) => (
              <div className="kv-item" key={k}>
                <span>{formatKey(k)}</span>
                <strong>{Array.isArray(v) ? v.join(", ") : v}</strong>
              </div>
            ))}
          </div>
        </section>

        {(loanData.benefits?.length || loanData.charges) && (
          <section
            id="other-details"
            className="details-section reveal-on-scroll"
            ref={(n) => (sectionRefs.current["other-details"] = n)}
          >
            <h2>Other Details</h2>
            {loanData.benefits?.length > 0 && (
              <>
                <h3 className="sub-title">Benefits</h3>
                <div className="bullet-grid">
                  {loanData.benefits.map((b, i) => (
                    <div key={i} className="bullet-item">
                      {b}
                    </div>
                  ))}
                </div>
              </>
            )}

            {loanData.charges && Object.keys(loanData.charges).length > 0 && (
              <>
                <h3 className="sub-title">Charges</h3>
                <div className="kv-grid">
                  {Object.entries(loanData.charges).map(([k, v]) => (
                    <div className="kv-item" key={k}>
                      <span>{formatKey(k)}</span>
                      <strong>{v}</strong>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>
        )}

        <section
          id="faqs"
          className="details-section reveal-on-scroll"
          ref={(n) => (sectionRefs.current.faqs = n)}
        >
          <h2>FAQs</h2>
          <details>
            <summary>How is EMI calculated?</summary>
            <p>EMI is calculated using the reducing balance method and monthly interest compounding.</p>
          </details>
          <details>
            <summary>When can I apply for this loan?</summary>
            <p>You can apply immediately if your KYC is verified and eligibility requirements are met.</p>
          </details>
        </section>
      </main>
    </>
  );
}

function EmiCalculator({ interestRate }) {
  const [amount, setAmount] = useState("");
  const [rate, setRate] = useState("");
  const [tenure, setTenure] = useState("");
  const [unit, setUnit] = useState("months");
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (interestRate) setRate(interestRate.toString());
  }, [interestRate]);

  const nf = useMemo(
    () => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }),
    []
  );

  const onSubmit = (e) => {
    e.preventDefault();
    let P = Number(amount);
    let r = Number(rate) / 12 / 100;
    let n = Number(tenure);
    if (!P || !r || !n) return;
    if (unit === "years") n *= 12;

    const f = Math.pow(1 + r, n);
    const emi = (P * r * f) / (f - 1);
    setResult({ emi: nf.format(emi), total: nf.format(emi * n) });
  };

  return (
    <>
      <form className="emi-grid" onSubmit={onSubmit}>
        <div className="field">
          <label>Amount</label>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Enter amount" />
        </div>
        <div className="field">
          <label>Rate (%)</label>
          <input value={rate} disabled title="Interest rate is based on loan type" />
        </div>
        <div className="field">
          <label>Tenure</label>
          <input value={tenure} onChange={(e) => setTenure(e.target.value)} placeholder="Enter tenure" />
          <select value={unit} onChange={(e) => setUnit(e.target.value)}>
            <option value="months">Months</option>
            <option value="years">Years</option>
          </select>
        </div>
        <button className="primary-btn" type="submit">
          Calculate
        </button>
      </form>
      {result && (
        <div className="emi-result">
          <div>
            <span>Monthly EMI</span>
            <strong>Rs {result.emi}</strong>
          </div>
          <div>
            <span>Total Repayment</span>
            <strong>Rs {result.total}</strong>
          </div>
        </div>
      )}
    </>
  );
}
