import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Home from "./pages/user/Home";
import Login from "./pages/user/Login";
import Register from "./pages/user/Register";
import Loans from "./pages/user/Loans";
import UserProfile from "./pages/user/UserProfile";
import LoanDetails from "./pages/user/LoanDetails";
import TrackStatus from "./pages/user/TrackStatus";
import LoanApplication from "./pages/user/LoanApplication";
import LoanSummary from "./pages/user/LoanSummary";
import UserLoanDetails from "./pages/user/UserLoanDetails";
import CalculatorHome from "./pages/user/CalculatorHome";
import EMICalculator from "./Components/Calculator/EMICalculator";
import CibilCalculator from "./Components/Calculator/CibilCalculator";
import EligibilityCalculator from "./Components/Calculator/EligibilityCalculator";
import UpdateKyc from "./pages/user/UpdateKyc";
import RepaymentSchedule from "./pages/user/Repaymentschedule";
import PaymentPage from "./pages/payment/PaymentPage";
import Notifications from "./pages/user/Notifications";
import AboutUs from "./pages/user/AboutUs";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminApplications from "./pages/admin/AdminApplications";
import AdminApplicationDetails from "./pages/admin/AdminApplicationDetails";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminCustomers from "./pages/admin/AdminCustomers";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminReports from "./pages/admin/AdminReports";
import AdminActiveLoans from "./pages/admin/AdminActiveLoans";
import AdminLoanTracker from "./pages/admin/AdminLoanTracker";
import AdminNotifications from "./pages/admin/AdminNotifications";
import AdminKycApplications from "./pages/admin/AdminKycApplications";
import AdminLoanDisbursement from "./pages/admin/AdminLoanDisbursement";
import AdminProfitability from "./pages/admin/AdminProfitability";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import Footer from "./Components/Footer/Footer";
import AnalyticsTracker from "./Components/Analytics/AnalyticsTracker";

function RequireRole({ role, redirectTo, children }) {
  const token = localStorage.getItem("token");
  const currentRole = localStorage.getItem("role");

  if (!token || currentRole !== role) {
    return <Navigate to={redirectTo} replace />;
  }

  return children;
}

function App() {
  function AppRoutesWithFooter() {
    const location = useLocation();
    const path = location.pathname;
    const hideFooter =
      path === "/login" ||
      path === "/register" ||
      path.startsWith("/admin");

    return (
      <div className="app-shell">
        <AnalyticsTracker />
        <main className="app-main">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/loans" element={<Loans />} />
            <Route
              path="/profile"
              element={
                <RequireRole role="USER" redirectTo="/login">
                  <UserProfile />
                </RequireRole>
              }
            />
            <Route
              path="/profile/update-kyc"
              element={
                <RequireRole role="USER" redirectTo="/login">
                  <UpdateKyc />
                </RequireRole>
              }
            />
            <Route path="/loan-details/:loanTypeId" element={<LoanDetails />} />
            <Route
              path="/loan-apply/:loanTypeId"
              element={
                <RequireRole role="USER" redirectTo="/login">
                  <LoanApplication />
                </RequireRole>
              }
            />
            <Route
              path="/loan-summary"
              element={
                <RequireRole role="USER" redirectTo="/login">
                  <LoanSummary />
                </RequireRole>
              }
            />
            <Route
              path="/user-loan-details/:id"
              element={
                <RequireRole role="USER" redirectTo="/login">
                  <UserLoanDetails />
                </RequireRole>
              }
            />
            <Route path="/loan/:loanTypeId" element={<LoanDetails />} />
            <Route
              path="/track-status"
              element={
                <RequireRole role="USER" redirectTo="/login">
                  <TrackStatus />
                </RequireRole>
              }
            />
            <Route path="/CalculatorHome" element={<CalculatorHome />} />
            <Route path="/EMICalculator" element={<EMICalculator />} />
            <Route path="/CibilCalculator" element={<CibilCalculator />} />
            <Route path="/EligibilityCalculator" element={<EligibilityCalculator />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/about" element={<AboutUs />} />
            <Route
              path="/admin/applications"
              element={
                <RequireRole role="ADMIN" redirectTo="/admin/login">
                  <AdminApplications />
                </RequireRole>
              }
            />
            <Route
              path="/admin/applications/:id"
              element={
                <RequireRole role="ADMIN" redirectTo="/admin/login">
                  <AdminApplicationDetails />
                </RequireRole>
              }
            />
            <Route
              path="/admin/dashboard"
              element={
                <RequireRole role="ADMIN" redirectTo="/admin/login">
                  <AdminDashboard />
                </RequireRole>
              }
            />
            <Route
              path="/admin/customers"
              element={
                <RequireRole role="ADMIN" redirectTo="/admin/login">
                  <AdminCustomers />
                </RequireRole>
              }
            />
            <Route
              path="/admin/reports"
              element={
                <RequireRole role="ADMIN" redirectTo="/admin/login">
                  <AdminReports />
                </RequireRole>
              }
            />
            <Route
              path="/admin/profitability"
              element={
                <RequireRole role="ADMIN" redirectTo="/admin/login">
                  <AdminProfitability />
                </RequireRole>
              }
            />
            <Route
              path="/admin/analytics"
              element={
                <RequireRole role="ADMIN" redirectTo="/admin/login">
                  <AdminAnalytics />
                </RequireRole>
              }
            />
            <Route
              path="/admin/active-loans"
              element={
                <RequireRole role="ADMIN" redirectTo="/admin/login">
                  <AdminActiveLoans />
                </RequireRole>
              }
            />
            <Route
              path="/admin/active-loans/:id"
              element={
                <RequireRole role="ADMIN" redirectTo="/admin/login">
                  <AdminLoanTracker />
                </RequireRole>
              }
            />
            <Route
              path="/admin/notifications"
              element={
                <RequireRole role="ADMIN" redirectTo="/admin/login">
                  <AdminNotifications />
                </RequireRole>
              }
            />
            <Route
              path="/admin/disbursement"
              element={
                <RequireRole role="ADMIN" redirectTo="/admin/login">
                  <AdminLoanDisbursement />
                </RequireRole>
              }
            />
            <Route
              path="/admin/kyc"
              element={
                <RequireRole role="ADMIN" redirectTo="/admin/login">
                  <AdminKycApplications />
                </RequireRole>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <RequireRole role="ADMIN" redirectTo="/admin/login">
                  <AdminSettings />
                </RequireRole>
              }
            />
            <Route
              path="/repayment-schedule"
              element={
                <RequireRole role="USER" redirectTo="/login">
                  <RepaymentSchedule />
                </RequireRole>
              }
            />
            <Route
              path="/payment"
              element={
                <RequireRole role="USER" redirectTo="/login">
                  <PaymentPage />
                </RequireRole>
              }
            />
            <Route
              path="/notifications"
              element={
                <RequireRole role="USER" redirectTo="/login">
                  <Notifications />
                </RequireRole>
              }
            />
          </Routes>
        </main>
        {!hideFooter && <Footer />}
      </div>
    );
  }

  return (
  <>
    <BrowserRouter>
      <AppRoutesWithFooter />
    </BrowserRouter>
    </>
  );
}

export default App;
