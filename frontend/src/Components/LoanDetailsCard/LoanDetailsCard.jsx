export default function LoanDetailsCard({ loan }) {
  return (
    <section className="card">
      <h3 className="card-title">{loan.name}</h3>
      <div className="card-body">
        <dl className="kv">
          <div>
            <dt>Loan ID</dt>
            <dd>{loan.id}</dd>
          </div>
          <div>
            <dt>Principal</dt>
            <dd>₹ {loan.principal.toLocaleString("en-IN")}</dd>
          </div>
          <div>
            <dt>Rate</dt>
            <dd>{loan.rate}% p.a.</dd>
          </div>
          <div>
            <dt>Tenure</dt>
            <dd>{loan.tenureMonths} months</dd>
          </div>
          <div>
            <dt>EMI</dt>
            <dd>₹ {loan.emi.toLocaleString("en-IN")}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{loan.status}</dd>
          </div>
          <div>
            <dt>Disbursed On</dt>
            <dd>{loan.disbursedOn}</dd>
          </div>
          <div>
            <dt>Next Due</dt>
            <dd>{loan.nextDue}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}