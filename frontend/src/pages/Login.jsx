// src/pages/Login.jsx
import axios from "axios";
import React, { useState, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../utils/apiConfig";
import { FiEye, FiEyeOff, FiArrowLeft, FiArrowRight, FiMail, FiLock } from "react-icons/fi";
import useMeta from "../utils/useMeta";
import { Link } from "react-router-dom";
import brandLogo from "../assets/logo.jpg";
import ConstellationBg from "../components/common/ConstellationBg";

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
    <div className="min-h-screen lg:h-screen lg:overflow-hidden w-full flex bg-surface-muted">
      {/* Brand panel */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 xl:p-16 overflow-hidden text-white bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800">
        <ConstellationBg className="absolute inset-0 h-full w-full" />
        <div className="pointer-events-none absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-accent-500/15 blur-3xl" aria-hidden="true" />

        <div className="relative flex items-center gap-3">
          <img src={brandLogo} alt="Speshway HRMS" className="h-11 w-auto rounded-lg" />
          <span className="text-lg font-semibold tracking-wide">SPESHWAY HRMS</span>
        </div>

        <div className="relative max-w-lg">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/80 ring-1 ring-white/15">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-400" />
            Speshway HRMS
          </span>
          <h2 className="mt-6 text-4xl xl:text-5xl font-bold leading-[1.05] tracking-tight">
            One workplace,
            <br />
            every HR task in it.
          </h2>
          <p className="mt-5 text-white/60 leading-relaxed">
            One portal for your whole team &mdash; track attendance, approve leave, run
            payroll, hire faster and review performance, with dashboards that stay
            accurate in real time.
          </p>

          <div className="mt-9 flex items-center gap-x-3 gap-y-2 overflow-x-auto whitespace-nowrap text-[13px] font-medium text-white/70">
            {["Attendance", "Leave", "Payroll", "Recruitment", "Performance"].map((mod, i) => (
              <React.Fragment key={mod}>
                {i > 0 && <span className="h-1 w-1 shrink-0 rounded-full bg-white/25" />}
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent-400" />
                  {mod}
                </span>
              </React.Fragment>
            ))}
          </div>

        </div>

        <p className="relative text-white/40 text-xs">
          &copy; {new Date().getFullYear()} Speshway Solutions Pvt. Ltd. All rights reserved.
        </p>
      </div>

      {/* Form panel - no card */}
      <div className="relative w-full lg:w-1/2 flex flex-col lg:h-screen overflow-y-auto">
        <div className="p-6 sm:p-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-ink-muted shadow-panel ring-1 ring-surface-subtle transition-colors hover:text-ink"
          >
            <FiArrowLeft size={16} />
            Back to Home
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 pb-12 sm:px-10">
          <div className="w-full max-w-sm">
            <div className="mb-6 flex justify-center lg:hidden">
              <img src={brandLogo} alt="Speshway HRMS" className="h-12 w-auto rounded-md" />
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-ink text-center">
              Welcome Back
            </h1>
            <p className="mt-2 text-center text-sm text-ink-muted">
              Sign in to your Speshway HRMS account
            </p>

            {error && (
              <div
                role="alert"
                className="mt-6 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-muted"
                >
                  Email Address
                </label>
                <div className="relative">
                  <FiMail
                    size={18}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-faint"
                  />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocused((s) => ({ ...s, email: true }))}
                    onBlur={() => setFocused((s) => ({ ...s, email: false }))}
                    placeholder="name@example.com"
                    required
                    className="h-14 w-full rounded-2xl border border-surface-subtle bg-white pl-12 pr-4 text-ink placeholder:text-ink-faint outline-none transition hover:border-ink-faint focus:border-accent-500 focus:ring-4 focus:ring-accent-500/15"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-muted"
                >
                  Password
                </label>
                <div className="relative">
                  <FiLock
                    size={18}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-faint"
                  />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocused((s) => ({ ...s, password: true }))}
                    onBlur={() => setFocused((s) => ({ ...s, password: false }))}
                    placeholder="Enter your password"
                    required
                    className="h-14 w-full rounded-2xl border border-surface-subtle bg-white pl-12 pr-12 text-ink placeholder:text-ink-faint outline-none transition hover:border-ink-faint focus:border-accent-500 focus:ring-4 focus:ring-accent-500/15"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-ink-faint transition-colors hover:text-ink"
                  >
                    {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                  </button>
                </div>
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => navigate("/forgot-password")}
                    className="text-sm font-medium text-accent-600 transition-colors hover:text-accent-700"
                  >
                    Forgot password?
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`group flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-[15px] font-semibold text-white transition-colors ${
                  loading
                    ? "cursor-not-allowed bg-accent-300"
                    : "bg-accent-600 hover:bg-accent-700 active:bg-accent-800"
                }`}
              >
                {loading ? (
                  "Signing in..."
                ) : (
                  <>
                    Continue
                    <FiArrowRight
                      size={18}
                      className="transition-transform group-hover:translate-x-0.5"
                    />
                  </>
                )}
              </button>
            </form>

            <p className="mt-8 text-center text-xs text-ink-faint">
              By signing in you agree to our{" "}
              <Link to="/terms-and-conditions" className="text-accent-600 hover:text-accent-700">
                Terms
              </Link>{" "}
              and{" "}
              <Link to="/privacy-policy" className="text-accent-600 hover:text-accent-700">
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );

};

export default Login;
