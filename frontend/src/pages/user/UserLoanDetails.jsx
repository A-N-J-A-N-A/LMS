import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import Card from "../../Components/Card/Card";
import Navbar from "../../Components/Navbar/Navbar";
import "../../styles/UserLoanDetails.css";
import { useQuery } from "@tanstack/react-query";


function UserLoanDetails() {
  const { id } = useParams(); // 👈 MUST match route :id
  const token = localStorage.getItem("token");

  //const [loan, setLoan] = useState(null);
  //const [payments, setPayments] = useState([]);
  //const [loading, setLoading] = useState(true);
  //const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const pageSize = 10;

  const {
    data,
    isLoading: loading,
    isError,
    error,
  } = useQuery({
    queryKey: ["loanDetails", id],
    queryFn: async () => {
      if (!id) throw new Error("Invalid application ID");

      const res = await axios.get(
        `http://localhost:8080/loans/application/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const loanData = res.data;

      return {
        loan: {
          id: loanData.applicationId,
          name: loanData.loanName,
          principal: loanData.loanAmount,
          rate: loanData.interestRate,
          tenureMonths: loanData.tenure,
          status: loanData.status,
        },
        payments: Array.isArray(loanData.repaymentSchedule)
          ? loanData.repaymentSchedule.map((p) => ({
              id: p.installmentNo,
              label: `Payment ${p.installmentNo}`,
              date: p.dueDate,
              amount: p.amount,
            }))
          : [],
      };
    },
    enabled: !!id,
  });

  const loan = data?.loan;
  const payments = data?.payments || [];



  {/*}useEffect(() => {
    console.log("Application ID from URL:", id);

    if (!id) {
      setError("Invalid application ID");
      setLoading(false);
      return;
    }

    const fetchLoanApplication = async () => {
      try {
        setLoading(true);

        const res = await axios.get(
          `http://localhost:8080/loans/application/${id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = res.data;

        setLoan({
          id: data.applicationId,
          name: data.loanName,
          principal: data.loanAmount,
          rate: data.interestRate,
          tenureMonths: data.tenure,
          status: data.status,
        });

        setPayments(
          Array.isArray(data.repaymentSchedule)
            ? data.repaymentSchedule.map((p) => ({
                id: p.installmentNo,
                label: `Payment ${p.installmentNo}`,
                date: p.dueDate,
                amount: p.amount,
              }))
            : []
        );
      } catch (err) {
        console.error("API ERROR:", err);
        setError("Failed to load loan details");
      } finally {
        setLoading(false);
      }
    };

    fetchLoanApplication();
  }, [id, token]);*/}



  // 🔍 Search
  const filteredPayments = useMemo(() => {
    const q = query.toLowerCase();
    return payments.filter(
      (p) =>
        p.label.toLowerCase().includes(q) ||
        p.date.toLowerCase().includes(q) ||
        String(p.amount).includes(q)
    );
  }, [payments, query]);

  // 📄 Pagination
  const totalPages = Math.max(1, Math.ceil(filteredPayments.length / pageSize));
  const pagedPayments = filteredPayments.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  // ⏳ States
  if (loading) {
    return (
      <>
        <Navbar />
        <p style={{ padding: "40px" }}>Loading loan details...</p>
      </>
    );
  }

  if (isError) {
    return (
      <>
        <Navbar />
        <p style={{ padding: "40px", color: "red" }}>
          {error?.message || "Failed to load loan details"}
        </p>

      </>
    );
  }

  return (
    <div className="user-loans-wrap">
      <Navbar />


      <div className="user-loans-page">
        {/* 🔹 Loan Details */}
        <Card>
          <div className="uld-card">
            <h3 className="uld-title">{loan.name}</h3>

            <div className="uld-kv">
              <div>
                <dt>Application ID</dt>
                <dd>{loan.id}</dd>
              </div>
              <div>
                <dt>Principal</dt>
                <dd>₹ {loan.principal.toLocaleString("en-IN")}</dd>
              </div>
              <div>
                <dt>Interest Rate</dt>
                <dd>{loan.rate}% p.a.</dd>
              </div>
              <div>
                <dt>Tenure</dt>
                <dd>{loan.tenureMonths} months</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{loan.status}</dd>
              </div>
            </div>
          </div>
        </Card>

        {/* 🔹 Repayment Schedule */}
        <Card>
          <div className="uld-card">
            <h3 className="uld-title">Repayment Schedule</h3>

            <input
              type="text"
              placeholder="Search payments..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              className="uld-search"
            />

            <div className="uld-payment-list">
              {pagedPayments.length === 0 && (
                <div className="uld-empty">No payments found</div>
              )}

              {pagedPayments.map((p) => (
                <div key={p.id} className="uld-payment-row">
                  <div className="uld-payment-label">
                    <strong>{p.label}</strong>
                    <span className="uld-muted">
                      {p.date} • ₹ {p.amount.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* 🔹 Pagination */}
            <div className="uld-pager">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Prev
              </button>
              <span>
                Page {page} / {totalPages}
              </span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default UserLoanDetails;

