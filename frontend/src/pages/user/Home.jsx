import React, { useEffect, useMemo, useState } from "react";
import Navbar from "../../Components/Navbar/Navbar";
import "../../styles/Home.css";

import h1 from "../../assets/h1.png";
import h2 from "../../assets/h2.png";
import h3 from "../../assets/h3.png";
import bgBusiness from "../../assets/bg2.png";
import bgEducation from "../../assets/bg3.png";
import bgHome from "../../assets/bg1.png";
import bgPersonal from "../../assets/bg.png";
import { Link, useNavigate } from "react-router-dom";
import {
  BriefcaseBusiness,
  GraduationCap,
  HandCoins,
  House,
  ShieldCheck,
  Trophy,
  UsersRound,
  WalletCards,
} from "lucide-react";
function Home() {
    const heroAds = useMemo(() => [
      {
        key: "business",
        title: "Grow Your Business with a Business Loan",
        bullets: [
          "Quick Access to Funds",
          "Flexible Repayment Terms",
          "Expand and Boost Your Business",
        ],
        bg: bgBusiness,
        bgPosition: "right center",
      },
      {
        key: "education",
        title: "Fulfill Your Education Dreams with an Education Loan",
        bullets: [
          "Low Interest Rates",
          "Easy Repayment Options",
          "Cover Tuition and Living Expenses",
        ],
        bg: bgEducation,
        bgPosition: "right center",
      },
      {
        key: "home",
        title: "Make Your Dream Home Affordable",
        bullets: [
          "Low Interest Rates",
          "Flexible EMI Options",
          "Finance Up to 90% of Property Value",
        ],
        bg: bgHome,
        bgPosition: "right 58%",
      },
      {
        key: "personal",
        title: "How a Personal Loan Can Benefit You",
        bullets: [
          "Quick and Easy Approval",
          "Lower Interest Rates",
          "Consolidate Debt with Confidence",
        ],
        bg: bgPersonal,
        bgPosition: "right center",
      },
    ], []);
    const serviceCards = useMemo(
      () => [
        {
          key: "monitoring",
          image: h1,
          title: "Loan Monitoring Dashboard",
          description: "Keep an eye on all your loans in one place.",
        },
        {
          key: "emi",
          image: h2,
          title: "EMI & Payment Management",
          description: "Schedule and pay EMIs with ease.",
        },
        {
          key: "verification",
          image: h3,
          title: "Document & Verification",
          description: "Upload and verify documents securely.",
        },
      ],
      []
    );
    const productCards = useMemo(
      () => [
        {
          key: "home-loan",
          title: "Home Loan",
          description: "Turn your dream home into reality with flexible tenure and lower EMI plans.",
          loanTypeId: "HOME_LOAN",
          icon: <House size={26} />,
          tone: "home",
        },
        {
          key: "business-loan",
          title: "Business Loan",
          description: "Scale operations with quick funding designed for growing and established businesses.",
          loanTypeId: "BUSINESS_LOAN",
          icon: <BriefcaseBusiness size={26} />,
          tone: "business",
        },
        {
          key: "education-loan",
          title: "Education Loan",
          description: "Support tuition and related expenses with student-friendly repayment options.",
          loanTypeId: "EDUCATION_LOAN",
          icon: <GraduationCap size={26} />,
          tone: "education",
        },
        {
          key: "personal-loan",
          title: "Personal Loan",
          description: "Get fast support for life goals and emergencies with minimal documentation.",
          loanTypeId: "PERSONAL_LOAN",
          icon: <HandCoins size={26} />,
          tone: "personal",
        },
      ],
      []
    );

    const [activeAd, setActiveAd] = useState(0);
    const [activeService, setActiveService] = useState(1);
    useEffect(() => {
      heroAds.forEach((ad) => {
        const image = new Image();
        image.src = ad.bg;
      });
    }, [heroAds]);

    useEffect(() => {
      const counters = document.querySelectorAll(".metric h3");

      const animateCount = (el) => {
        const target = +el.getAttribute("data-target");
        const isDecimal = target % 1 !== 0;
        const suffix = el.innerText.includes("Cr") ? " Cr" :
                       el.innerText.includes("K") ? "K+" :
                       el.innerText.includes("+") ? "+" : "%";

        const duration = 2000;
        const startTime = performance.now();

        const update = (time) => {
          const progress = Math.min((time - startTime) / duration, 1);
          const value = progress * target;

          el.innerText = isDecimal
            ? value.toFixed(1) + suffix
            : Math.floor(value).toLocaleString() + suffix;

          if (progress < 1) requestAnimationFrame(update);
        };

        requestAnimationFrame(update);
      };

      const observer = new IntersectionObserver(
        (entries, obs) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              animateCount(entry.target);
              obs.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.5 }
      );

      counters.forEach((counter) => observer.observe(counter));
    }, []);

    useEffect(() => {
      const intervalId = window.setInterval(() => {
        setActiveService((prev) => (prev + 1) % serviceCards.length);
      }, 3000);
      return () => window.clearInterval(intervalId);
    }, [serviceCards.length]);

    useEffect(() => {
      const targets = Array.from(document.querySelectorAll(".reveal-on-view"));
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
        { threshold: 0.12, rootMargin: "0px 0px -10% 0px" }
      );

      targets.forEach((el, i) => {
        if (!el.style.getPropertyValue("--reveal-delay")) {
          el.style.setProperty("--reveal-delay", `${Math.min(i * 55, 260)}ms`);
        }
        observer.observe(el);
      });

      return () => observer.disconnect();
    }, []);
const navigate = useNavigate();

const goToLogin = () => navigate("/login");
const goToRegister = () => navigate("/register");

const scrollToServices = () => {
  document
    .getElementById("services")
    ?.scrollIntoView({ behavior: "smooth" });
};

const goToPreviousAd = () => {
  setActiveAd((prev) => (prev - 1 + heroAds.length) % heroAds.length);
};

const goToNextAd = () => {
  setActiveAd((prev) => (prev + 1) % heroAds.length);
};

const getServicePositionClass = (index) => {
  const normalized = (index - activeService + serviceCards.length) % serviceCards.length;
  if (normalized === 0) return "is-center";
  if (normalized === 1) return "is-right";
  return "is-left";
};

const renderHeroContent = (ad) => (
    <div className="hero-left">
      <div className="hero-shell">
        <div className="hero-copy">
          <h1>{ad.title}</h1>
          <p className="hero-subtitle">
            Built for modern banking teams with compliant underwriting, faster approvals, and
            transparent borrower journeys.
          </p>
          <ul className="hero-feature-list">
            {ad.bullets.map((point) => (
              <li key={point}>
                <span aria-hidden className="hero-feature-icon">+</span>
                {point}
              </li>
            ))}
          </ul>
          <div className="hero-actions">
            <button className="btn-primary" onClick={goToLogin}>
              Get Started
            </button>
            <button className="btn-secondary" onClick={scrollToServices}>
              Learn More
            </button>
          </div>
          <div className="hero-trust-strip" aria-label="Platform highlights">
            <div>
              <strong>24x7</strong>
              <span>Relationship Desk</span>
            </div>
            <div>
              <strong>ISO</strong>
              <span>Security Practices</span>
            </div>
            <div>
              <strong>99.9%</strong>
              <span>Service Reliability</span>
            </div>
          </div>
          <div className="hero-carousel-controls" aria-label="Hero carousel controls">
            <button
              type="button"
              className="hero-arrow"
              onClick={goToPreviousAd}
              aria-label="Show previous slide"
            >
              {"<"}
            </button>
            <div className="hero-dots" role="tablist" aria-label="Hero ads">
              {heroAds.map((item, index) => (
                <button
                  key={item.key}
                  type="button"
                  className={`hero-dot ${index === activeAd ? "active" : ""}`}
                  onClick={() => {
                    if (index === activeAd) return;
                    setActiveAd(index);
                  }}
                  aria-label={`Show ${item.key} ad`}
                />
              ))}
            </div>
            <button
              type="button"
              className="hero-arrow"
              onClick={goToNextAd}
              aria-label="Show next slide"
            >
              {">"}
            </button>
          </div>
        </div>
      </div>
    </div>
);
  return (
    <>
      <Navbar noSpacer />
      <div className="home-page">

      {/* HERO */}
      <section className="hero">
        <div
          className="hero-bg"
          style={{
            backgroundImage: `url(${heroAds[activeAd].bg})`,
            backgroundPosition: heroAds[activeAd].bgPosition || "right center",
          }}
          aria-hidden
        />
        <div className="hero-content-stack">
          <div className="hero-content-item hero-content-item-active" key={heroAds[activeAd].key}>
            {renderHeroContent(heroAds[activeAd])}
          </div>
        </div>

      </section>

<section className="products-section reveal-on-view" id="products">
  <h2 className="section-title reveal-on-view">Products We Offer</h2>
  <div className="products-grid">
    {productCards.map((product) => (
      <Link
        to={`/loan-details/${product.loanTypeId}`}
        className="product-card-link reveal-on-view"
        key={product.key}
      >
        <article className="product-card">
        <div className={`product-icon-wrap ${product.tone}`} aria-hidden>
          <span className="product-icon">{product.icon}</span>
        </div>
        <div className="product-content">
          <h3>{product.title}</h3>
          <p>{product.description}</p>
        </div>
        </article>
      </Link>
    ))}
  </div>
</section>

<section className="services reveal-on-view" id="services">

  <h2 className="section-title reveal-on-view">Our Services</h2>

  <div className="service-grid" aria-live="polite">
    {serviceCards.map((card, index) => (
      <article
        key={card.key}
        className={`service-card ${getServicePositionClass(index)}`}
        aria-label={card.title}
      >
        <img src={card.image} alt={card.title} />
        <h3>{card.title}</h3>
        <p>{card.description}</p>
      </article>
    ))}
  </div>
</section>

<section className="why-choose reveal-on-view" id="why-choose">
  <h2 className="section-title reveal-on-view">Why Choose Us?</h2>
  <p className="why-subtitle reveal-on-view">
    Choose a bank that combines proven trust, transparent lending, and responsive support at every
    stage of your journey.
  </p>
  <div className="why-pillars reveal-on-view">
    <span className="reveal-on-view">Trusted Legacy</span>
    <span className="reveal-on-view">Transparent Pricing</span>
    <span className="reveal-on-view">Fast Approvals</span>
    <span className="reveal-on-view">Secure Digital Journey</span>
    <span className="reveal-on-view">Relationship-First Support</span>
  </div>
</section>

      {/* SERVICES */}
      <section className="trusted-pride reveal-on-view" id="trusted">
        <div className="trusted-head reveal-on-view">
          <p className="trusted-kicker">CrediFlow Banking Pride</p>
          <h2 className="section-title trusted-title">
            <Trophy size={30} aria-hidden />
            <span>Trusted by Thousands of Customers</span>
            <Trophy size={30} aria-hidden />
          </h2>
          <p className="trusted-subtitle">
            Built on secure systems, consistent service, and the confidence of borrowers who bank
            with us every day.
          </p>
        </div>

        <div className="trusted-metrics reveal-on-view">
          <article className="metric reveal-on-view">
            <div className="metric-icon" aria-hidden>
              <WalletCards size={22} />
            </div>
            <h3 data-target="10000">0+</h3>
            <span>Loans Managed (Cr)</span>
            <p>Powering customer ambitions with dependable credit support</p>
          </article>

          <article className="metric reveal-on-view">
            <div className="metric-icon" aria-hidden>
              <UsersRound size={22} />
            </div>
            <h3 data-target="500">0K+</h3>
            <span>Happy Users</span>
            <p>A growing community built on service quality and trust</p>
          </article>

          <article className="metric reveal-on-view">
            <div className="metric-icon" aria-hidden>
              <ShieldCheck size={22} />
            </div>
            <h3 data-target="99.9">0%</h3>
            <span>Data Security</span>
            <p>Enterprise-grade safeguards protecting every transaction</p>
          </article>
        </div>
      </section>



      {/* CTA */}

  <section className="cta reveal-on-view">
    <div className="cta-content reveal-on-view">
      <h2>Get Started with CrediFlow Today!</h2>
      <button className="btn-primary" onClick={goToRegister}>
        Join Now
      </button>

    </div>
  </section>
      </div>
    </>
  );
}

export default Home;









