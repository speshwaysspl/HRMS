// src/pages/Login.jsx
// Layout mirrors nutri_hrms AuthShell, swapped: brand "story" panel left, form panel right
// (live clock check-in card + Leave/Payslips chips). Below lg the story panel
// becomes a dark header and the form sits in a rounded sheet over it — the
// two halves are equal height on phones (each ≥ 50dvh, flex-1 basis-0).
// Flutter mirror: mobile/lib/screens/login_screen.dart.
import axios from "axios";
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiArrowLeft, FiArrowRight, FiEye, FiEyeOff, FiLoader, FiLock, FiMail } from "react-icons/fi";
import { PreviewChips, STORY_BG, formatClock, useNow } from "../components/common/CheckInPreview";
import { IdCardBack, IdCardFront } from "../components/common/IdCard";

// Sample details for the decorative ID card on the sign-in panel.
const DEMO_EMPLOYEE = {
  userId: { name: "Your Name" },
  designation: "Your Designation",
  employeeId: "SPW 0001",
  mobilenumber: "9154986733",
};
import { useAuth } from "../context/AuthContext";
import { API_BASE } from "../utils/apiConfig";
import useMeta from "../utils/useMeta";
import brandLogo from "../assets/logo.jpg";

const greetingFor = (h) => (h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening");

const Brand = ({ dark = false }) => (
  <div className="flex items-center gap-3">
    <span className={`grid h-11 w-11 place-items-center rounded-xl ${dark ? "bg-white" : "bg-brand-50"}`}>
      <img src={brandLogo} alt="" className="h-8 w-8 object-contain" />
    </span>
    <span className="flex flex-col leading-tight">
      <span className={`text-[17px] font-bold ${dark ? "text-white" : "text-ink"}`}>Speshway Solutions</span>
      <span className={`text-[13px] font-medium ${dark ? "text-brand-200" : "text-ink-muted"}`}>HRMS Application</span>
    </span>
  </div>
);

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const now = useNow();
  const { clock, meridiem } = formatClock(now);
  const date = now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [slow, setSlow] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const canonical = useMemo(() => `${window.location.origin}/login`, []);
  useMeta({
    title: "Login - Speshway HRMS | Speshway Solutions",
    description: "Secure login for Speshway HRMS. Access your employee dashboard, view payslips, apply for leaves, and manage attendance via the Speshway portal.",
    keywords: "Speshway login, Speshway HRMS login, Speshway Solutions, HRMS portal, employee login, Speshway HRMS sign in",
    url: canonical,
    image: "/images/Logo.jpg",
    robots: "noindex,nofollow",
  });

  // After 3 s of signing in, say it is still working (slow networks).
  useEffect(() => {
    if (!loading) {
      setSlow(false);
      return undefined;
    }
    const t = setTimeout(() => setSlow(true), 3000);
    return () => clearTimeout(t);
  }, [loading]);

  const validateEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

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
      const response = await axios.post(`${API_BASE}/api/auth/login`, { email, password });

      if (response.data?.success) {
        login(response.data.user);
        localStorage.setItem("token", response.data.token || "");
        sessionStorage.setItem("token", response.data.token || "");

        const roles = Array.isArray(response.data.user.role) ? response.data.user.role : [response.data.user.role];
        if (roles.includes("admin")) return navigate("/admin-dashboard");
        if (roles.includes("hr")) return navigate("/hr-dashboard");
        if (roles.includes("candidate")) return navigate("/candidate-dashboard");
        // Employee and Team Lead share one dashboard.
        navigate("/employee-dashboard");
      } else {
        setError(response.data?.error || "Login failed");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Server error — try again");
    } finally {
      setLoading(false);
    }
  };

  const inputWrap =
    "relative flex items-center rounded-xl border border-surface-subtle bg-surface-muted transition hover:border-ink-faint focus-within:border-accent-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-accent-500/15";
  const inputCls = "h-[52px] w-full min-w-0 flex-1 rounded-xl bg-transparent pl-12 pr-4 text-base text-ink caret-accent-600 outline-none placeholder:text-ink-faint";

  return (
    <div className="flex min-h-[100dvh] flex-col bg-white lg:grid lg:h-[100dvh] lg:grid-cols-[1.1fr_1fr] lg:overflow-hidden">
      {/* Form panel */}
      <main className="relative z-[1] -mt-8 flex min-h-[calc(50dvh+2rem)] flex-1 basis-0 flex-col justify-between gap-5 rounded-t-[28px] bg-white px-4 pb-[calc(20px+env(safe-area-inset-bottom))] pt-6 shadow-[0_-12px_32px_-16px_rgba(5,3,20,0.35)] lg:mt-0 lg:min-h-0 lg:gap-6 lg:overflow-y-auto lg:rounded-none lg:px-[clamp(16px,6vw,88px)] lg:py-[clamp(24px,4vw,48px)] lg:shadow-none">
        <div className="flex items-center justify-between gap-3">
          <div className="hidden lg:block">
            <Brand />
          </div>
          <Link
            to="/"
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-surface-subtle px-3.5 text-sm font-semibold text-ink transition-colors hover:border-transparent hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
          >
            <FiArrowLeft size={16} /> Back to home
          </Link>
        </div>

        <div className="mx-auto w-full max-w-[400px]">
          <header className="mb-5 lg:mb-8">
            <h1 className="text-[28px] font-bold leading-[1.05] tracking-[-0.03em] text-ink lg:text-[clamp(2rem,3vw,2.5rem)]">
              Sign in to your workspace
            </h1>
            <p className="mt-2.5 text-base leading-relaxed text-ink-muted">
              Use your Speshway Solutions work email — one login for employees and HR.
            </p>
          </header>

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
            {error && (
              <div role="alert" className="rounded-xl bg-red-50 px-3.5 py-3 text-[15px] font-medium text-red-700">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-semibold text-ink">Email address</label>
              <div className={inputWrap}>
                <FiMail size={18} className="pointer-events-none absolute left-4 text-ink-muted" aria-hidden="true" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@speshway.com"
                  autoComplete="username"
                  inputMode="email"
                  required
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-semibold text-ink">Password</label>
              <div className={inputWrap}>
                <FiLock size={18} className="pointer-events-none absolute left-4 text-ink-muted" aria-hidden="true" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                  className={`${inputCls} pr-1`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="mr-1 grid h-11 w-11 flex-none place-items-center rounded-lg text-ink-muted transition-colors hover:bg-brand-50 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 active:scale-95"
                >
                  {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>
            </div>

            <div className="-mt-2 flex justify-end">
              <Link to="/forgot-password" className="rounded text-sm font-semibold text-accent-600 hover:text-accent-700 hover:underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group mt-2 inline-flex h-[54px] items-center justify-center gap-2.5 rounded-xl bg-accent-600 text-base font-semibold text-white transition hover:bg-accent-700 active:scale-[0.985] disabled:cursor-progress disabled:opacity-70 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent-500/40"
            >
              {loading ? (
                <>
                  <FiLoader size={18} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> Signing you in…
                </>
              ) : (
                <>
                  Continue <FiArrowRight size={18} className="transition-transform group-hover:translate-x-[3px]" aria-hidden="true" />
                </>
              )}
            </button>
            {loading && slow ? (
              <p role="status" className="-mt-2 text-center text-[13px] text-ink-muted">
                Still working — this can take a few seconds on a slow connection.
              </p>
            ) : null}
          </form>

        </div>

      </main>

      {/* Story panel — dark header on phones, left panel on desktop (order first) */}
      <aside
        className="relative isolate order-first flex min-h-[50dvh] w-full flex-1 basis-0 flex-col items-center justify-between gap-6 overflow-hidden px-4 pb-[52px] pt-5 text-center text-white lg:m-3 lg:w-auto lg:min-h-0 lg:justify-center lg:gap-[clamp(20px,4vh,40px)] lg:rounded-[28px] lg:px-[clamp(32px,4.5vw,64px)] lg:py-[clamp(28px,5vh,56px)]"
        style={STORY_BG}
      >
        <div className="self-stretch text-left lg:hidden">
          <Brand dark />
        </div>

        <header className="flex w-full max-w-[420px] flex-col items-center">
          {/* Phones show the live clock here instead of the check-in card. */}
          <p className="mb-2 flex items-baseline justify-center gap-1.5 text-[64px] font-bold leading-none tracking-[-0.05em] tabular-nums lg:hidden">
            <time dateTime={now.toISOString()}>{clock}</time>
            <small className="text-base tracking-normal text-accent-300">{meridiem}</small>
          </p>
          <p className="mb-1 text-[15px] font-medium text-brand-200 lg:mb-3">{date}</p>
          <h2 className="max-w-[20ch] text-[22px] font-bold leading-[1.1] tracking-[-0.03em] lg:text-[clamp(1.75rem,min(2.6vw,4.5vh),2.5rem)]">
            Welcome back to <span className="text-accent-300">Speshway.</span>
          </h2>
          <p className="mt-2 max-w-[34ch] text-sm leading-relaxed text-brand-200 lg:mt-3 lg:text-[15px]">
            {greetingFor(now.getHours())} — sign in to check in, track leave and get your payslips.
          </p>
        </header>

        {/* Product preview, centred: card with the chips aligned to its width */}
        <div className="relative flex w-full max-w-[420px] flex-col items-center gap-3.5 text-left lg:max-w-[360px]" aria-hidden="true">
          <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 hidden aspect-square w-[150%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10 shadow-[0_0_0_48px_rgba(255,255,255,0.025),inset_0_0_0_48px_rgba(255,255,255,0.025)] lg:block" />
          {/* Desktop: the digital ID card (real components, sample details), front over back */}
          <div className="relative hidden h-[clamp(300px,46vh,380px)] w-full lg:block">
            <div className="absolute left-1/2 top-1/2 origin-center -translate-x-[18%] -translate-y-1/2 rotate-[8deg] scale-[0.6] opacity-90 [filter:drop-shadow(0_30px_40px_rgba(5,3,20,0.55))]">
              <IdCardBack employee={DEMO_EMPLOYEE} />
            </div>
            <div className="absolute left-1/2 top-1/2 origin-center -translate-x-[82%] -translate-y-1/2 -rotate-[4deg] scale-[0.6] [filter:drop-shadow(0_40px_50px_rgba(5,3,20,0.7))]">
              <IdCardFront employee={DEMO_EMPLOYEE} />
            </div>
          </div>
          <p className="hidden text-sm font-medium text-white lg:block">Your digital ID card — always in your pocket.</p>
          <PreviewChips className="lg:hidden" />
        </div>

        <p className="hidden text-sm font-medium text-brand-200 lg:block">Attendance · Leave · Payroll · Performance</p>
      </aside>
    </div>
  );
};

export default Login;
