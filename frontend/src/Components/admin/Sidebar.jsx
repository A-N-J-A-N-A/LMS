import { NavLink } from "react-router-dom";

function Sidebar() {
  return (
    <div
      className="bg-dark text-white p-3"
      style={{ width: "260px", minHeight: "100vh" }}
    >
      <h4 className="mb-4 fw-bold">CREDIFLOW</h4>

      <nav className="nav flex-column gap-2">
        <NavLink to="/admin/dashboard" className="nav-link text-white">
          Dashboard
        </NavLink>

        <NavLink to="/admin/applications" className="nav-link text-white">
          Loan Applications
        </NavLink>

        <NavLink to="#" className="nav-link text-white">
          Customer Accounts
        </NavLink>

        <NavLink to="#" className="nav-link text-white">
          Audit Logs
        </NavLink>

        <NavLink to="#" className="nav-link text-white">
          Reports
        </NavLink>

        <NavLink to="#" className="nav-link text-white">
          Settings
        </NavLink>

        <hr className="text-white" />

        <NavLink to="/admin/login" className="nav-link text-white">
          Logout
        </NavLink>
      </nav>
    </div>
  );
}

export default Sidebar;
