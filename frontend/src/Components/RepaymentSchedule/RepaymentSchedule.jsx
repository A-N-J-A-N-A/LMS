import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getRepaymentSchedule } from "../../services/loanService";

const PAGE_SIZE = 5;

function RepaymentSchedule() {
  const [page, setPage] = useState(1);

  // ✅ TanStack Query
  const { data: schedule = [], isLoading, isError } = useQuery({
    queryKey: ["repaymentSchedule"],
    queryFn: getRepaymentSchedule,
  });

  const start = (page - 1) * PAGE_SIZE;
  const currentData = schedule.slice(start, start + PAGE_SIZE);

  if (isLoading) return <p>Loading...</p>;
  if (isError) return <p>Failed to load repayment schedule.</p>;

  return (
    <div>
      <h3>Repayment Schedule</h3>

      <table>
        <thead>
          <tr>
            <th>Month</th>
            <th>Principal</th>
            <th>Interest</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {currentData.map((row) => (
            <tr key={row.month}>
              <td>{row.month}</td>
              <td>{row.principal}</td>
              <td>{row.interest}</td>
              <td>{row.total}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: "10px" }}>
        <button
          disabled={page === 1}
          onClick={() => setPage((prev) => prev - 1)}
        >
          Prev
        </button>

        <button
          disabled={start + PAGE_SIZE >= schedule.length}
          onClick={() => setPage((prev) => prev + 1)}
          style={{ marginLeft: "10px" }}
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default RepaymentSchedule;


{/*import React, { useEffect, useState } from "react";
import { getRepaymentSchedule } from "../../services/loanService";

const PAGE_SIZE = 5;

function RepaymentSchedule() {
  const [schedule, setSchedule] = useState([]);
  const [page, setPage] = useState(1);

  useEffect(() => {
    getRepaymentSchedule().then(setSchedule);
  }, []);

  const start = (page - 1) * PAGE_SIZE;
  const currentData = schedule.slice(start, start + PAGE_SIZE);

  return (
    <div>
      <h3>Repayment Schedule</h3>

      <table>
        <thead>
          <tr>
            <th>Month</th>
            <th>Principal</th>
            <th>Interest</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {currentData.map((row) => (
            <tr key={row.month}>
              <td>{row.month}</td>
              <td>{row.principal}</td>
              <td>{row.interest}</td>
              <td>{row.total}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: "10px" }}>
        <button disabled={page === 1} onClick={() => setPage(page - 1)}>Prev</button>
        <button disabled={start + PAGE_SIZE >= schedule.length} onClick={() => setPage(page + 1)} style={{ marginLeft: "10px" }}>Next</button>
      </div>
    </div>
  );
}

export default RepaymentSchedule;*/}

