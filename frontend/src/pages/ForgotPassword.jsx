import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { FiArrowLeft, FiMail, FiLock, FiEye, FiEyeOff, FiCheckCircle } from "react-icons/fi";
import { API_BASE } from "../utils/apiConfig";
import useMeta from "../utils/useMeta";
import brandLogo from "../assets/logo.jpg";

// Forgot password with an emailed 6-digit OTP:
// 1) email → 2) code → 3) new password → done.
// Mirrors mobile/lib/screens/forgot_password_screen.dart.

const STEPS = ["email", "otp", "password", "done"];
const OTP_LEN = 6;

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(Array(OTP_LEN).fill(""));
  const [resetToken, setResetToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const otpRefs = useRef([]);

  const canonical = useMemo(() => `${window.location.origin}/forgot-password`, []);
  useMeta({
    title: "Forgot Password — Speshway HRMS",
    description: "Reset your Speshway HRMS password with a one-time code sent to your email.",
    keywords: "reset password, HRMS, Speshway password reset, recover account",
    url: canonical,
    image: "/images/Logo.jpg",
    robots: "noindex,nofollow",
  });

  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [resendIn]);

  useEffect(() => {
    if (step === "otp") otpRefs.current[0]?.focus();
  }, [step]);

  const sendCode = async (e) => {
    e?.preventDefault();
    setError("");
    setInfo("");
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError("Enter a valid email address.");
    setLoading(true);
    try {
      const { data } = await axios.post(`${API_BASE}/api/auth/forgot-password/otp`, { email: email.trim() });
      setInfo(data.message);
      setResendIn(data.resendIn || 60);
      setOtp(Array(OTP_LEN).fill(""));
      setStep("otp");
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't send the code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const setDigit = (i, v) => {
    const digits = v.replace(/\D/g, "");
    if (digits.length > 1) {
      // Pasted the whole code
      const next = Array(OTP_LEN).fill("").map((_, k) => digits[k] || "");
      setOtp(next);
      otpRefs.current[Math.min(digits.length, OTP_LEN) - 1]?.focus();
      return;
    }
    const next = [...otp];
    next[i] = digits;
    setOtp(next);
    if (digits && i < OTP_LEN - 1) otpRefs.current[i + 1]?.focus();
  };

  const onOtpKey = (i, e) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus();
  };

  const verifyCode = async (e) => {
    e.preventDefault();
    setError("");
    const code = otp.join("");
    if (code.length !== OTP_LEN) return setError("Enter the 6-digit code.");
    setLoading(true);
    try {
      const { data } = await axios.post(`${API_BASE}/api/auth/forgot-password/verify-otp`, { email: email.trim(), otp: code });
      setResetToken(data.resetToken);
      setInfo("");
      setStep("password");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid code.");
    } finally {
      setLoading(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    if (password !== confirm) return setError("Passwords don't match.");
    setLoading(true);
    try {
      await axios.post(`${API_BASE}/api/auth/reset-password/${resetToken}`, { password });
      setStep("done");
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't reset the password. Start again.");
    } finally {
      setLoading(false);
    }
  };

  const stepIndex = STEPS.indexOf(step);
  const titles = {
    email: ["Forgot password?", "Enter your registered email and we'll send you a 6-digit code."],
    otp: ["Check your email", `Enter the 6-digit code sent to ${email.trim()}.`],
    password: ["Create a new password", "Choose a password with at least 6 characters."],
    done: ["Password updated", "You can now sign in with your new password."],
  };

  const inputCls =
    "w-full rounded-xl border border-surface-subtle bg-white py-3 pl-11 pr-4 text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent-500";
  const primaryBtn =
    "w-full min-h-[48px] rounded-xl bg-accent-600 hover:bg-accent-700 text-white font-semibold transition-colors disabled:opacity-60";

  return (
    <div className="flex items-center justify-center min-h-screen bg-surface-muted px-4 py-10">
      <div className="w-full max-w-md bg-white shadow-panel rounded-2xl p-7 sm:p-8 border border-surface-subtle">
        <div className="flex items-center justify-between mb-6">
          {step === "otp" || step === "password" ? (
            <button
              type="button"
              onClick={() => { setError(""); setStep(step === "otp" ? "email" : "otp"); }}
              className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-ink hover:bg-surface-muted"
              aria-label="Back"
            >
              <FiArrowLeft size={20} />
            </button>
          ) : <span className="w-10" />}
          <img src={brandLogo} alt="Speshway HRMS" className="h-10 w-auto rounded-md" />
          <span className="w-10" />
        </div>

        {step !== "done" && (
          <div className="flex gap-1.5 mb-6" aria-label={`Step ${stepIndex + 1} of 3`}>
            {[0, 1, 2].map((i) => (
              <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= stepIndex ? "bg-accent-600" : "bg-surface-subtle"}`} />
            ))}
          </div>
        )}

        {step === "done" && (
          <FiCheckCircle className="mx-auto text-accent-600 mb-3" size={48} />
        )}
        <h1 className={`text-2xl font-semibold text-ink ${step === "done" ? "text-center" : ""}`}>{titles[step][0]}</h1>
        <p className={`text-ink-muted mt-1.5 text-sm ${step === "done" ? "text-center" : ""}`}>{titles[step][1]}</p>

        {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2.5">{error}</p>}

        {step === "email" && (
          <form onSubmit={sendCode} className="mt-6 space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-ink-muted">Email</span>
              <span className="relative block mt-1.5">
                <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-faint" />
                <input type="email" autoComplete="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com" className={inputCls} />
              </span>
            </label>
            <button type="submit" disabled={loading} className={primaryBtn}>{loading ? "Sending code…" : "Send code"}</button>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={verifyCode} className="mt-6 space-y-5">
            <div className="flex justify-between gap-2" role="group" aria-label="6-digit code">
              {otp.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => (otpRefs.current[i] = el)}
                  value={d}
                  onChange={(e) => setDigit(i, e.target.value)}
                  onKeyDown={(e) => onOtpKey(i, e)}
                  inputMode="numeric"
                  autoComplete={i === 0 ? "one-time-code" : "off"}
                  maxLength={OTP_LEN}
                  aria-label={`Digit ${i + 1}`}
                  className="w-12 h-14 sm:w-14 sm:h-16 rounded-xl border border-surface-subtle text-center text-2xl font-bold text-ink tabular-nums focus:outline-none focus:ring-2 focus:ring-accent-500"
                />
              ))}
            </div>
            <button type="submit" disabled={loading} className={primaryBtn}>{loading ? "Verifying…" : "Verify code"}</button>
            <p className="text-sm text-center text-ink-muted">
              Didn't get it?{" "}
              {resendIn > 0 ? (
                <span className="tabular-nums">Resend in {resendIn}s</span>
              ) : (
                <button type="button" onClick={sendCode} disabled={loading} className="font-semibold text-brand-600 hover:underline">
                  Resend code
                </button>
              )}
            </p>
          </form>
        )}

        {step === "password" && (
          <form onSubmit={savePassword} className="mt-6 space-y-4">
            {[
              ["New password", password, setPassword, "new-password"],
              ["Confirm password", confirm, setConfirm, "new-password"],
            ].map(([label, value, set, ac], i) => (
              <label key={label} className="block">
                <span className="text-sm font-medium text-ink-muted">{label}</span>
                <span className="relative block mt-1.5">
                  <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-faint" />
                  <input type={show ? "text" : "password"} autoComplete={ac} autoFocus={i === 0} value={value}
                    onChange={(e) => set(e.target.value)} className={`${inputCls} pr-12`} />
                  {i === 0 && (
                    <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center text-ink-faint hover:text-ink">
                      {show ? <FiEyeOff /> : <FiEye />}
                    </button>
                  )}
                </span>
              </label>
            ))}
            <button type="submit" disabled={loading} className={primaryBtn}>{loading ? "Saving…" : "Update password"}</button>
          </form>
        )}

        {step === "done" && (
          <button type="button" onClick={() => navigate("/login")} className={`${primaryBtn} mt-6`}>Back to sign in</button>
        )}

        {step !== "done" && (
          <p className="mt-6 text-center text-sm text-ink-muted">
            Remembered it? <Link to="/login" className="font-semibold text-brand-600 hover:underline">Sign in</Link>
          </p>
        )}
        {info && step === "otp" && <p className="sr-only" aria-live="polite">{info}</p>}
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
