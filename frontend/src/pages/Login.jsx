// src/pages/Login.jsx
import axios from "axios";
import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../utils/apiConfig";

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState({ email: false, password: false });

  const validateEmail = (e) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Please enter email and password.");
      return;
    }
    if (!validateEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `${API_BASE}/api/auth/login`,
        { email, password }
      );

      if (response.data?.success) {
        login(response.data.user);
        localStorage.setItem("token", response.data.token || "");
        if (remember) localStorage.setItem("rememberEmail", email);
        else localStorage.removeItem("rememberEmail");

        // redirect based on role
        if (response.data.user.role === "admin") {
          navigate("/admin-dashboard");
        } else {
          navigate("/employee-dashboard/attendance");
        }
      } else {
        setError(response.data?.error || "Login failed");
      }
    } catch (err) {
      // friendly error reporting
      if (err.response?.data?.error) setError(err.response.data.error);
      else setError("Server error — try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        // overlay + background image
        backgroundImage:
          "linear-gradient(rgba(2,6,23,0.6), rgba(2,6,23,0.6)), url('/images/download.jpeg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        padding: "32px",
      }}
    >
      {/* floating card */}
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: "360px",
          maxWidth: "92%",
          borderRadius: "14px",
          padding: "28px",
          background: "rgba(255,255,255,0.06)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: hovered
            ? "0 20px 60px rgba(2,6,23,0.6)"
            : "0 10px 30px rgba(2,6,23,0.45)",
          transform: hovered ? "translateY(-6px) scale(1.02)" : "translateY(0) scale(1)",
          transition: "all 300ms cubic-bezier(.2,.9,.2,1)",
          color: "#E8FDF5",
          animation: "fadeIn 700ms ease-out both",
        }}
      >
        <h1
          style={{
            fontSize: "20px",
            fontWeight: 700,
            marginBottom: "12px",
            textAlign: "center",
            letterSpacing: "0.6px",
            color: "#fff",
            textShadow: "0 2px 10px rgba(0,0,0,0.5)",
          }}
        >
          WELCOME TO<br></br>
         SPESHWAY SOLUTIONS 
        </h1>

        <p
          style={{
            textAlign: "center",
            marginBottom: "18px",
            color: "#CFEFE7",
            fontSize: "13px",
            opacity: 0.95,
          }}
        >
          Login to your account
        </p>

        {error && (
          <div
            role="alert"
            style={{
              background: "linear-gradient(90deg,#40120b,#7a1c1c)",
              color: "#fff",
              padding: "8px 12px",
              borderRadius: "8px",
              marginBottom: "14px",
              fontSize: "13px",
              boxShadow: "inset 0 -2px 0 rgba(0,0,0,0.08)",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Email */}
          <div style={{ marginBottom: "14px" }}>
            <label
              htmlFor="email"
              style={{
                display: "block",
                fontSize: "13px",
                marginBottom: "6px",
                color: focused.email ? "#C1F7E6" : "#BFDCD3",
              }}
            >
              Email
            </label>
            <div style={{ position: "relative" }}>
              {/* input */}
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocused((s) => ({ ...s, email: true }))}
                onBlur={() => setFocused((s) => ({ ...s, email: false }))}
                placeholder="you@example.com"
                required
                style={{
                  width: "100%",
                  padding: "12px 14px 12px 42px",
                  borderRadius: "10px",
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "transparent",
                  color: "#fff",
                  outline: "none",
                  transition: "box-shadow 180ms, border 180ms",
                  boxShadow: focused.email
                    ? "0 6px 18px rgba(0,188,170,0.08)"
                    : "none",
                }}
              />

              {/* icon (simple envelope) */}
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                style={{
                  position: "absolute",
                  left: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  opacity: 0.9,
                  fill: "none",
                }}
              >
                <path
                  d="M3 6.5v11A2.5 2.5 0 0 0 5.5 20h13A2.5 2.5 0 0 0 21 17.5v-11A2.5 2.5 0 0 0 18.5 4h-13A2.5 2.5 0 0 0 3 6.5z"
                  stroke="#CFEFE7"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M21 7.2l-8 5-8-5"
                  stroke="#CFEFE7"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          {/* Password */}
          <div style={{ marginBottom: "12px" }}>
            <label
              htmlFor="password"
              style={{
                display: "block",
                fontSize: "13px",
                marginBottom: "6px",
                color: focused.password ? "#C1F7E6" : "#BFDCD3",
              }}
            >
              Password
            </label>
            <div style={{ position: "relative" }}>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocused((s) => ({ ...s, password: true }))}
                onBlur={() => setFocused((s) => ({ ...s, password: false }))}
                placeholder="Enter your password"
                required
                style={{
                  width: "100%",
                  padding: "12px 42px 12px 42px",
                  borderRadius: "10px",
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "transparent",
                  color: "#fff",
                  outline: "none",
                  transition: "box-shadow 180ms, border 180ms",
                  boxShadow: focused.password
                    ? "0 6px 18px rgba(0,188,170,0.08)"
                    : "none",
                }}
              />

              {/* show/hide button */}
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  color: "#CFEFE7",
                  cursor: "pointer",
                  padding: "6px",
                  fontSize: "13px",
                }}
              >
                {showPassword ? "Hide" : "Show"}
              </button>

              {/* lock icon left */}
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                style={{
                  position: "absolute",
                  left: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  opacity: 0.9,
                }}
              >
                <rect
                  x="3"
                  y="10"
                  width="18"
                  height="11"
                  rx="2"
                  stroke="#CFEFE7"
                  strokeWidth="1.2"
                  fill="none"
                />
                <path
                  d="M7 10V8a5 5 0 0 1 10 0v2"
                  stroke="#CFEFE7"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          {/* remember + forgot */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "right",
              marginBottom: "16px",
            }}
          >
           

            <button
              type="button"
              onClick={() => navigate("/forgot-password")}
              style={{
                background: "transparent",
                border: "none",
                color: "#1370daff",
                fontSize: "13px",
                textDecoration: "underline",
                cursor: "pointer",
                padding: 0,
              }}
            >
              Forgot password?
            </button>
          </div>

          {/* submit */}
          <div style={{ marginBottom: "6px" }}>
            <button
  type="submit"
  disabled={loading}
  style={{
    width: "100%",
    padding: "12px",
    borderRadius: "10px",
    border: "none",
    cursor: loading ? "not-allowed" : "pointer",
    background: loading
      ? "linear-gradient(90deg,#4da3ff,#1d6fe0)"
      : "linear-gradient(90deg,#1e90ff,#0066cc)", // Blue gradient
    color: "#fff",
    fontWeight: 700,
    fontSize: "15px",
    boxShadow: loading
      ? "0 6px 18px rgba(0,0,0,0.15)"
      : "0 10px 30px rgba(0,102,204,0.28)",
    transform: hovered ? "translateY(-2px)" : "none",
    transition: "all 220ms ease",
  }}
>
  {loading ? "Signing in..." : "Login"}
</button>

          </div>

          {/* small note */}
         
        </form>
      </div>

      {/* local style for keyframes */}
      <style>
        {`
          @keyframes fadeIn {
            0% { opacity: 0; transform: translateY(6px) scale(0.995); }
            100% { opacity: 1; transform: translateY(0) scale(1); }
          }
        `}
      </style>
    </div>
  );
};

export default Login;
