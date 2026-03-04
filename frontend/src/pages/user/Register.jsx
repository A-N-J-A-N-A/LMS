import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import "../../styles/Register.css";

// assets
import registerIllustration from "../../assets/register1.png";
// or .png / .svg / .json (Lottie)

function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const passwordRegex=/^(?=.*[A-Z])(?=.*\d)(?=.*[@&$!%])[A-Za-z\d@$!%&]{8,}$/;
  const emailRegex = /^[A-Za-z0-9._%+-]{3,}@gmail\.com$/;

   const handlePasswordChange = (e) => {
      const value = e.target.value;
      setPassword(value);
    };

  const getPasswordStrength = (value) => {
    if (!value) {
      return { score: 0, label: "", message: "" };
    }

    let score = 0;
    if (value.length >= 8) score += 1;
    if (/[A-Z]/.test(value)) score += 1;
    if (/\d/.test(value)) score += 1;
    if (/[@&$!%]/.test(value)) score += 1;

    if (score <= 1) {
      return {
        score,
        label: "Weak",
        message: "Use 8+ chars with uppercase, number, and @&$!% symbol",
      };
    }
    if (score <= 3) {
      return {
        score,
        label: "Medium",
        message: "Add missing rules to make your password stronger",
      };
    }

    return {
      score,
      label: "Strong",
      message: "Strong password",
    };
  };

  const strength = getPasswordStrength(password);

  const handleRegister = async () => {
    setError("");

    if (!name || !email || !mobile || !password || !confirmPassword) {
      setError("All fields are required");
      return;
    }
       if(name.trim().length<3){
           setError("Full name must be at least 3 characters long");
           return;
           }

    // 2. Email validation
        if (!emailRegex.test(email)) {
          setError("Email must be at least 3 characters and end with @gmail.com");
          return;
        }

        // 3. Mobile validation (Indian format)
        if (!/^[6-9]\d{9}$/.test(mobile)) {
          setError("Mobile number must be 10 digits and start with 6-9");
          return;
        }

        if(!passwordRegex.test(password)){
           setError("Password must be at least 8 characters long and include 1 uppercase letter,1 number,1 special character ");
           return;
        }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("http://localhost:8080/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: name,
          email,
          mobile,
          password,
        }),
      });
      let data = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }

      if (!res.ok) {
        setError(data?.message || data?.error || "Registration failed");
        setLoading(false);
        return;
      }

      navigate("/login");
    } catch {
      setError("Server error");
      setLoading(false);
    }
  };

  return (
      <div className="register-page">
        {/* LEFT SIDE */}
        <div className="cf-auth-left">
          {/* BACKGROUND LAYER */}
          <div className="cf-auth-left-bg"></div>

          {/* CONTENT LAYER */}
          <div className="cf-left-content">
            <h1 className="cf-animated-brand">CrediFlow</h1>

            <p className="cf-left-subtitle">
              Create your account and unlock smarter loan management
            </p>

            <img
                src={registerIllustration}
                alt="Fintech Illustration"
                className="cf-left-image"
            />
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="register-container">
          <div className="register-card">
            <div className="register-brand">CrediFlow</div>

            <h2>Get Started</h2>

            <label>Full Name</label>
            <input
                value={name}
                placeholder="Enter your full name"
                onChange={(e) => setName(e.target.value)}
            />

            <label>Email</label>
            <input
                value={email}
                placeholder="name@gmail.com"
                onChange={(e) => setEmail(e.target.value)}
            />

            <label>Mobile</label>
            <input
                value={mobile}
                placeholder="10-digit mobile number"
                onChange={(e) => setMobile(e.target.value)}
            />

            <label>Password</label>
            <div className="register-password-wrap">
              <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  placeholder="Password"
                  onChange={handlePasswordChange}
              />
              <button
                  type="button"
                  className="register-password-toggle"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {password && (
                <div className="register-password-strength" aria-live="polite">
                  <div className="register-strength-track">
                    <div
                        className={`register-strength-fill register-strength-${strength.label.toLowerCase()}`}
                        style={{ width: `${(strength.score / 4) * 100}%` }}
                    />
                  </div>
                  <p className="register-strength-meta">
                    <span>{strength.label} password</span>
                    <span>{strength.score}/4</span>
                  </p>
                  {strength.label !== "Strong" && (
                      <p className="register-strength-message">{strength.message}</p>
                  )}
                </div>
            )}

            <label>Confirm Password</label>
            <div className="register-password-wrap">
              <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  placeholder="Confirm Password"
                  onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <button
                  type="button"
                  className="register-password-toggle"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {error && <p className="register-error">{error}</p>}

            <button
                className="register-btn"
                onClick={handleRegister}
                disabled={loading}
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>

            <p className="register-login-text">
              Already have an account? <a href="/login">Log In</a>
            </p>
          </div>
        </div>
      </div>
  );
}

export default Register;
