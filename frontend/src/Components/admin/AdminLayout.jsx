import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Users,
  BarChart3,
  Settings,
  Bell,
  ShieldCheck,
  HandCoins,
  PieChart,
  Activity,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import "../../styles/admin/admin-theme.css";
import "../../styles/admin/admin-layout.css";
import api from "../../services/api";

function AdminLayout({ children }) {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    navigate("/admin/login");
  };

  // 🔥 TanStack Query replaces useEffect + setInterval
  const { data } = useQuery({
    queryKey: ["adminSidebarCounts"],
    queryFn: async () => {
      const [pendingPrepaymentRes, statsRes] = await Promise.all([
        api.get("/admin/prepayment-requests", {
          params: { status: "PENDING" },
        }),
        api.get("/admin/loan-applications/dashboard-stats"),
      ]);

      return {
        pendingNotificationCount: Array.isArray(
          pendingPrepaymentRes.data
        )
          ? pendingPrepaymentRes.data.length
          : 0,
        pendingApplicationsCount: Number(
          statsRes.data?.pending || 0
        ),
        approvedForDisbursementCount: Number(
          statsRes.data?.approved || 0
        ),
      };
    },
    refetchInterval: 30000, // 🔥 auto refresh every 30 seconds
  });

  const pendingNotificationCount =
    data?.pendingNotificationCount || 0;
  const pendingApplicationsCount =
    data?.pendingApplicationsCount || 0;
  const approvedForDisbursementCount =
    data?.approvedForDisbursementCount || 0;

  return (
    <div className="layout">

      {/* ===== MOBILE TOPBAR ===== */}
      <div className="mobile-topbar">
        <button
          className="menu-btn"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu size={22} />
        </button>
        <h3>CREDIFLOW</h3>
      </div>

      {/* ===== SIDEBAR ===== */}
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-top">
          <div className="sidebar-header">
            <h2 className="logo">CREDIFLOW</h2>
            <button
              className="close-btn"
              onClick={() => setSidebarOpen(false)}
            >
              <X size={20} />
            </button>
          </div>

          <nav className="menu">
            <NavLink to="/admin/dashboard" className="menu-item">
              <LayoutDashboard size={18} />
              Dashboard
            </NavLink>

            <NavLink to="/admin/applications" className="menu-item">
              <FileText size={18} />
              Loan Applications
              {pendingApplicationsCount > 0 && (
                <span className="admin-menu-badge">
                  {pendingApplicationsCount > 99
                    ? "99+"
                    : pendingApplicationsCount}
                </span>
              )}
            </NavLink>

            <NavLink to="/admin/active-loans" className="menu-item">
              <FileText size={18} />
              Active Loans
            </NavLink>

            <NavLink to="/admin/customers" className="menu-item">
              <Users size={18} />
              Customers
            </NavLink>

            <NavLink to="/admin/reports" className="menu-item">
              <BarChart3 size={18} />
              Reports
            </NavLink>

            <NavLink to="/admin/analytics" className="menu-item">
              <Activity size={18} />
              Analytics
            </NavLink>

            <NavLink to="/admin/profitability" className="menu-item">
              <PieChart size={18} />
              Profitability
            </NavLink>

            <NavLink to="/admin/notifications" className="menu-item">
              <Bell size={18} />
              Notifications
              {pendingNotificationCount > 0 && (
                <span className="admin-menu-badge">
                  {pendingNotificationCount > 99
                    ? "99+"
                    : pendingNotificationCount}
                </span>
              )}
            </NavLink>

            <NavLink to="/admin/kyc" className="menu-item">
              <ShieldCheck size={18} />
              KYC Verification
            </NavLink>

            <NavLink to="/admin/disbursement" className="menu-item">
              <HandCoins size={18} />
              Loan Disbursement
              {approvedForDisbursementCount > 0 && (
                <span className="admin-menu-badge">
                  {approvedForDisbursementCount > 99
                    ? "99+"
                    : approvedForDisbursementCount}
                </span>
              )}
            </NavLink>

            <NavLink to="/admin/settings" className="menu-item">
              <Settings size={18} />
              Settings
            </NavLink>
          </nav>
        </div>

        <button className="logout-btn" onClick={handleLogout}>
          <LogOut size={18} />
          Logout
        </button>
      </aside>

      {sidebarOpen && (
        <div
          className="overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="content">{children}</main>
    </div>
  );
}

export default AdminLayout;


{/*import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Users,
  BarChart3,
  Settings,
  Bell,
  ShieldCheck,
  HandCoins,
  PieChart,
  Activity,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import "../../styles/admin/admin-theme.css";
import "../../styles/admin/admin-layout.css";
import api from "../../services/api";

function AdminLayout({ children }) {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingNotificationCount, setPendingNotificationCount] = useState(0);
  const [pendingApplicationsCount, setPendingApplicationsCount] = useState(0);
  const [approvedForDisbursementCount, setApprovedForDisbursementCount] = useState(0);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    navigate("/admin/login");
  };

  useEffect(() => {
    let mounted = true;

    const loadSidebarCounts = async () => {
      try {
        const [pendingPrepaymentRes, statsRes] = await Promise.all([
          api.get("/admin/prepayment-requests", { params: { status: "PENDING" } }),
          api.get("/admin/loan-applications/dashboard-stats"),
        ]);

        if (!mounted) return;

        const pendingPrepaymentCount = Array.isArray(pendingPrepaymentRes.data)
          ? pendingPrepaymentRes.data.length
          : 0;
        setPendingNotificationCount(pendingPrepaymentCount);
        setPendingApplicationsCount(Number(statsRes.data?.pending || 0));
        setApprovedForDisbursementCount(Number(statsRes.data?.approved || 0));
      } catch (e) {
        if (!mounted) return;
        setPendingNotificationCount(0);
        setPendingApplicationsCount(0);
        setApprovedForDisbursementCount(0);
      }
    };

    loadSidebarCounts();
    const id = setInterval(loadSidebarCounts, 30000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  return (
    <div className="layout">


      <div className="mobile-topbar">
        <button
          className="menu-btn"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu size={22} />
        </button>
        <h3>CREDIFLOW</h3>
      </div>


      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-top">
          <div className="sidebar-header">
            <h2 className="logo">CREDIFLOW</h2>
            <button
              className="close-btn"
              onClick={() => setSidebarOpen(false)}
            >
              <X size={20} />
            </button>
          </div>

          <nav className="menu">
            <NavLink to="/admin/dashboard" className="menu-item">
              <LayoutDashboard size={18} />
              Dashboard
            </NavLink>

            <NavLink to="/admin/applications" className="menu-item">
              <FileText size={18} />
              Loan Applications
              {pendingApplicationsCount > 0 && (
                <span className="admin-menu-badge">
                  {pendingApplicationsCount > 99 ? "99+" : pendingApplicationsCount}
                </span>
              )}
            </NavLink>

            <NavLink to="/admin/active-loans" className="menu-item">
              <FileText size={18} />
              Active Loans
            </NavLink>

            <NavLink to="/admin/customers" className="menu-item">
              <Users size={18} />
              Customers
            </NavLink>

            <NavLink to="/admin/reports" className="menu-item">
              <BarChart3 size={18} />
              Reports
            </NavLink>

            <NavLink to="/admin/analytics" className="menu-item">
              <Activity size={18} />
              Analytics
            </NavLink>

            <NavLink to="/admin/profitability" className="menu-item">
              <PieChart size={18} />
              Profitability
            </NavLink>

            <NavLink to="/admin/notifications" className="menu-item">
              <Bell size={18} />
              Notifications
              {pendingNotificationCount > 0 && (
                <span className="admin-menu-badge">{pendingNotificationCount > 99 ? "99+" : pendingNotificationCount}</span>
              )}
            </NavLink>

            <NavLink to="/admin/kyc" className="menu-item">
              <ShieldCheck size={18} />
              KYC Verification
            </NavLink>

            <NavLink to="/admin/disbursement" className="menu-item">
              <HandCoins size={18} />
              Loan Disbursement
              {approvedForDisbursementCount > 0 && (
                <span className="admin-menu-badge">
                  {approvedForDisbursementCount > 99 ? "99+" : approvedForDisbursementCount}
                </span>
              )}
            </NavLink>

            <NavLink to="/admin/settings" className="menu-item">
              <Settings size={18} />
              Settings
            </NavLink>
          </nav>
        </div>

        <button className="logout-btn" onClick={handleLogout}>
          <LogOut size={18} />
          Logout
        </button>
      </aside>


      {sidebarOpen && (
        <div
          className="overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}


      <main className="content">
        {children}
      </main>
    </div>
  );
}

export default AdminLayout;*/}
