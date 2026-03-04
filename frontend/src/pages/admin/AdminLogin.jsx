import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../../styles/admin/admin-theme.css";
import "../../styles/admin/admin-login.css";
import { useAuth } from "../../context/AuthContext";

function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const res = await axios.post("http://localhost:8080/auth/login/admin", {
        email,
        password,
      });

      login(res.data.token, "ADMIN");
      navigate("/admin/dashboard");
    } catch (err) {
      setError("Invalid admin credentials");
    }
  };

  return (
    <div className="admin-login-wrapper">
      <div className="admin-login-panel">
        <div className="brand-block">
          <h1>CREDIFLOW</h1>
          <p>Corporate Admin Console</p>
        </div>

        <h2>Sign In</h2>
        <p className="login-subtitle">
          Authorized access for banking operations team.
        </p>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleLogin} className="login-form">
          <label>Email</label>
          <input
            type="email"
            placeholder="Enter admin email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label>Password</label>
          <input
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button type="submit">Login</button>
        </form>

        <p className="login-footer">Copyright 2026 Crediflow Banking System</p>
      </div>
    </div>
  );
}

export default AdminLogin;
