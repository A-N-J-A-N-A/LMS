import Navbar from "../../Components/Navbar/Navbar";
import { getAllLoans } from "../../services/loanService";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../../styles/Loans.css";
import { useQuery } from "@tanstack/react-query";
import { BriefcaseBusiness, GraduationCap, Home, StickyNote, User } from "lucide-react";

const themeByLoanType = {
  personal: {
    icon: <User size={45} color=" #273975"/>,
    badgeClass: "teal",
    accentClass: "teal",
    buttonClass: "indigo",
  },
  home: {
    icon: <Home size={45} color=" #273975"/>,
    badgeClass: "sky",
    accentClass: "sky",
    buttonClass: "blue",
  },
  education: {
    icon: <GraduationCap size={45} color=" #273975"/>,
    badgeClass: "violet",
    accentClass: "violet",
    buttonClass: "violet",
  },
  business: {
    icon: <BriefcaseBusiness size={45} color=" #273975"/>,
    badgeClass: "gold",
    accentClass: "gold",
    buttonClass: "indigo",
  },
  default: {
    icon: <StickyNote size={45} color=" #273975"/>,
    badgeClass: "sky",
    accentClass: "sky",
    buttonClass: "blue",
  },
};

function resolveTheme(loan) {
  const source = `${loan.loanTypeId || ""} ${loan.name || ""}`.toLowerCase();
  if (source.includes("personal")) return themeByLoanType.personal;
  if (source.includes("home")) return themeByLoanType.home;
  if (source.includes("education")) return themeByLoanType.education;
  if (source.includes("business")) return themeByLoanType.business;
  return themeByLoanType.default;
}

function Loans() {
  //const [loans, setLoans] = useState([]);
  //const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const {
    data: loans = [],
    isLoading: loading,
    isError,
    error,
  } = useQuery({
    queryKey: ["loans"],
    queryFn: async () => {
      const response = await getAllLoans();
      return Array.isArray(response.data) ? response.data : [];
    },
  });

  {isError && (
    <p className="loans-empty">Failed to load loans</p>
  )}


  const filteredLoans = useMemo(() => {
    const q = String(searchQuery || "").trim().toLowerCase();
    if (!q) return loans;
    return loans.filter((loan) =>
      `${loan.name || ""} ${loan.loanTypeId || ""}`.toLowerCase().includes(q)
    );
  }, [loans, searchQuery]);

  const handleApply = (loanId) => {
    navigate(`/loan-apply/${loanId}`);
  };

  return (
    <div className="loans-page">
      <Navbar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />

      <div className="loans-shell">
        <h1 className="loans-title">Our Loan Products</h1>

        {loading ? (
          <p className="loans-empty">Loading loans...</p>
        ) : filteredLoans.length === 0 ? (
          <p className="loans-empty">No loans found</p>
        ) : (
          <div className="loans-grid">
            {filteredLoans.map((loan) => {
              const theme = resolveTheme(loan);
              return (
                <article className="loan-product-card" key={loan.id}>
                  <div className={`loan-icon-wrap ${theme.accentClass}`}>
                    <span className="loan-icon">{theme.icon}</span>
                  </div>


                  <h3 className="loan-product-name">{loan.name}</h3>
                  <p className="loan-product-rate">
                    <strong className={theme.accentClass}>{loan.interestRate}%</strong> Interest Rate
                  </p>

                  <div className="loan-card-divider" />

                  <Link to={`/loan-details/${loan.id}`} className="loan-know-more">
                    Know More <span aria-hidden>→</span>
                  </Link>

                  <button
                    className={`loan-apply-btn ${theme.buttonClass}`}
                    onClick={() => handleApply(loan.id)}
                  >
                    Apply Now <span aria-hidden>→</span>
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default Loans;



