import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import "../../styles/Login.css";
import { useAuth } from "../../context/AuthContext";

// image imports
import authBg from "../../assets/herobg.png";
import paymentIllustration from "../../assets/loginleft.png";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async () => {
       setError("");

      if (!email || !password) {
        setError("Email and password required");
        return;
      }

      if (!/\S+@\S+\.\S+/.test(email)) {
        setError("Invalid email format");
        return;
      }

      try {
        const res = await fetch("http://localhost:8080/auth/login/user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.message || "Login failed");
          return;
        }


        const token = data?.token || data?.accessToken;
        if (!token) {
          setError("Login response missing token");
          return;
        }

        login(token, "USER");

        navigate("/loans");

      } catch (err) {
        setError("Server error");
      }
    };


  return (
      <div className="cf-auth-page">
        {/* LEFT SIDE */}
        <div
            className="cf-auth-left"
            style={{
              backgroundImage: `url(${authBg})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
        >
          <div className="cf-left-content">
            <h1 className="cf-animated-brand">CrediFlow</h1>
            <p className="cf-left-subtitle">
              Your Life, Your Loan, Your Way
            </p>

            <img
                src={paymentIllustration}
                alt="Digital payment transfer"
                className="cf-auth-image"
            />
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="cf-auth-right">
          <div className="cf-auth-card">
            <div className="cf-brand">CrediFlow</div>

            <h2>Log In</h2>
            {error && (
                <p className="cf-subtitle">
                  Enter your valid credentials to continue
                </p>
            )}

            <label>Email Address</label>
            <input
                type="email"
                placeholder="name@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
            />

            <label>Password</label>
            <div className="cf-password-wrap">
              <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
              />
              <button
                  type="button"
                  className="cf-password-toggle"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {error && <p className="cf-error">{error}</p>}

            <button className="cf-login-btn" onClick={handleLogin}>
              Log In
            </button>

            <p className="cf-register-text">
              Don’t have an account? <a href="/register">Register</a>
            </p>
          </div>
        </div>
      </div>
  );
}

export default Login;
