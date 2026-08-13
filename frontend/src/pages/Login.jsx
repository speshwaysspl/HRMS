// src/pages/Login.jsx
import axios from "axios";
import { useState, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../utils/apiConfig";
import { FiEye, FiEyeOff } from "react-icons/fi";
import useMeta from "../utils/useMeta";
import { Link } from "react-router-dom";

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

  const canonical = useMemo(() => `${window.location.origin}/login`, []);
  useMeta({
    title: "Login - Speshway HRMS | Speshway Solutions",
    description: "Secure login for Speshway HRMS. Access your employee dashboard, view payslips, apply for leaves, and manage attendance via the Speshway portal.",
    keywords: "Speshway login, Speshway HRMS login, Speshway Solutions, HRMS portal, employee login, Speshway HRMS sign in",
    url: canonical,
    image: "/images/Logo.jpg",
    robots: "noindex,nofollow",
  });

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
        sessionStorage.setItem("token", response.data.token || "");
        if (remember) localStorage.setItem("rememberEmail", email);
        else localStorage.removeItem("rememberEmail");

        const roles = Array.isArray(response.data.user.role) 
                      ? response.data.user.role 
                      : [response.data.user.role];

        // If admin, go to admin dashboard directly
        if (roles.includes("admin")) {
          navigate("/admin-dashboard");
          return;
        }

        // If hr, go to hr dashboard directly
        if (roles.includes("hr")) {
          navigate("/hr-dashboard");
          return;
        }

        // If candidate, go to candidate dashboard directly
        if (roles.includes("candidate")) {
          navigate("/candidate-dashboard");
          return;
        }

        // Employee and Team Lead now share a single dashboard, with
        // team-lead-only sections shown conditionally in the sidebar.
        navigate("/employee-dashboard");
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
    <div className="min-h-screen w-full flex">
      {/* Brand panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-brand-900 flex-col justify-between p-12 relative overflow-hidden">
        <div className="flex items-center gap-3">
          <img src="/images/Logo.jpg" alt="Speshway HRMS" className="h-10 w-auto rounded-lg" />
          <span className="text-white font-semibold tracking-wide">SPESHWAY HRMS</span>
        </div>
        <div className="max-w-md">
          <h2 className="text-3xl font-semibold text-white leading-tight">
            The complete HR platform for growing teams
          </h2>
          <p className="text-white/60 mt-4 text-sm leading-relaxed">
            Attendance, leave, payroll, recruitment and performance — unified in one secure portal.
          </p>
        </div>
        <p className="text-white/40 text-xs">
          &copy; {new Date().getFullYear()} Speshway Solutions Pvt. Ltd.
        </p>
      </div>

      {/* Form panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-surface-muted p-6 sm:p-8">
      {/* login card */}
      <div className="w-[380px] max-w-[92%] rounded-xl p-8 bg-white border border-surface-subtle shadow-panel">
        <div className="flex flex-col items-center mb-2 lg:hidden">
          <img src="/images/Logo.jpg" alt="Speshway HRMS" className="h-12 w-auto rounded-md mb-4" />
        </div>

        <h1 className="text-xl font-semibold mb-1 text-center lg:text-left tracking-wide text-ink">
          Welcome back
        </h1>

        <p className="text-center lg:text-left mb-6 text-ink-muted text-sm">
          Sign in to your Speshway HRMS account
        </p>

        {error && (
          <div
            role="alert"
            className="bg-red-50 text-red-700 border border-red-200 px-3 py-2 rounded-lg mb-4 text-sm"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Email */}
          <div className="mb-4">
            <label
              htmlFor="email"
              className={`block text-sm mb-1.5 ${focused.email ? "text-brand-700" : "text-ink-muted"}`}
            >
              Email
            </label>
            <div className="relative">
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
                className="w-full py-3 pl-11 pr-3.5 rounded-lg border border-surface-subtle bg-white text-ink placeholder:text-ink-faint outline-none transition focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />

              {/* icon (simple envelope) */}
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                className="absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none"
                fill="none"
              >
                <path
                  d="M3 6.5v11A2.5 2.5 0 0 0 5.5 20h13A2.5 2.5 0 0 0 21 17.5v-11A2.5 2.5 0 0 0 18.5 4h-13A2.5 2.5 0 0 0 3 6.5z"
                  stroke="#1a3d6d"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M21 7.2l-8 5-8-5"
                  stroke="#1a3d6d"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          {/* Password */}
          <div className="mb-3">
            <label
              htmlFor="password"
              className={`block text-sm mb-1.5 ${focused.password ? "text-brand-700" : "text-ink-muted"}`}
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocused((s) => ({ ...s, password: true }))}
                onBlur={() => setFocused((s) => ({ ...s, password: false }))}
                placeholder="Enter your password"
                required
                className="w-full py-3 pl-11 pr-12 rounded-lg border border-surface-subtle bg-white text-ink placeholder:text-ink-faint outline-none transition focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />

              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center p-1.5 rounded-md border border-surface-subtle bg-surface-muted text-ink-muted hover:text-ink"
              >
                {showPassword ? (
                  <FiEyeOff size={16} />
                ) : (
                  <FiEye size={16} />
                )}
              </button>

              {/* lock icon left */}
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                className="absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none"
                fill="none"
              >
                <rect
                  x="3"
                  y="10"
                  width="18"
                  height="11"
                  rx="2"
                  stroke="#1a3d6d"
                  strokeWidth="1.5"
                  fill="none"
                />
                <path
                  d="M7 10V8a5 5 0 0 1 10 0v2"
                  stroke="#1a3d6d"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          {/* remember + forgot */}
          <div className="flex items-center justify-end mb-4">
            <button
              type="button"
              onClick={() => navigate("/forgot-password")}
              className="bg-transparent border-none text-brand-600 hover:text-brand-700 text-sm underline cursor-pointer p-0"
            >
              Forgot password?
            </button>
          </div>

          {/* submit */}
          <div className="mb-1.5">
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-lg border-none font-semibold text-[15px] text-white transition ${
                loading
                  ? "bg-accent-300 cursor-not-allowed"
                  : "bg-accent-600 hover:bg-accent-700 cursor-pointer"
              }`}
            >
              {loading ? "Signing in..." : "Login"}
            </button>
          </div>
        </form>
        <p className="text-center text-sm text-ink-muted mt-4">
          By signing in you agree to our
          <Link to="/terms-and-conditions" className="text-brand-600 hover:text-brand-700 ml-1 mr-1">Terms & Conditions</Link>
          and
          <Link to="/privacy-policy" className="text-brand-600 hover:text-brand-700 ml-1">Privacy Policy</Link>.
        </p>
      </div>
      </div>
    </div>
  );
};

export default Login;
