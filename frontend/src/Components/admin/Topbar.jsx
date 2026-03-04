function Topbar() {
  return (
    <div className="bg-white shadow-sm p-3 d-flex justify-content-between">
      <h5 className="m-0">Loan Management Admin Portal</h5>

      <div>
        <span className="me-3">Logged in as Admin</span>
        <span className="badge bg-dark">ADMIN</span>
      </div>
    </div>
  );
}

export default Topbar;
