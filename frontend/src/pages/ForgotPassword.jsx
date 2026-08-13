import { useState, useMemo } from "react";
import axios from "axios";
import { Link } from "react-router-dom"; // ✅ Import Link
import { API_BASE } from "../utils/apiConfig";
import useMeta from "../utils/useMeta";

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const canonical = useMemo(() => `${window.location.origin}/forgot-password`, []);
  useMeta({
    title: "Forgot Password — Speshway HRMS",
    description: "Reset your Speshway HRMS password securely via email. Speshway Solutions password recovery.",
    keywords: "reset password, HRMS, Speshway password reset, recover account",
    url: canonical,
    image: "/images/Logo.jpg",
    robots: "noindex,nofollow",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!email) {
      setError("Please enter your registered email.");
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post(
        `${API_BASE}/api/auth/forgot-password`,
        { email }
      );

      if (res.data.success) {
        setMessage(res.data.message);
      } else {
        setError(res.data.message || "Something went wrong.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Server error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-surface-muted px-4">
      <div className="w-full max-w-md bg-white shadow-panel rounded-xl p-8 border border-surface-subtle">
        <div className="flex flex-col items-center mb-6">
          <img
            src="/images/Logo.jpg"
            alt="Speshway HRMS"
            className="h-12 w-auto rounded-md mb-4"
          />
          <h2 className="text-2xl font-semibold text-center text-ink">
            Forgot Password
          </h2>
          <p className="text-sm text-ink-muted text-center mt-1">
            Enter your registered email to receive a reset link
          </p>
        </div>

        {message && (
          <div className="bg-accent-50 text-accent-700 border border-accent-200 px-4 py-2 rounded-lg mb-4 text-sm">
            {message}
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-700 border border-red-200 px-4 py-2 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Enter your registered email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-surface-subtle rounded-lg px-4 py-2.5 text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2.5 rounded-lg text-white font-medium transition ${
              loading
                ? "bg-accent-300 cursor-not-allowed"
                : "bg-accent-600 hover:bg-accent-700"
            }`}
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        <p className="text-sm text-ink-muted text-center mt-4">
          We’ll send a password reset link to your email.
        </p>

        {/* ✅ Back to Login Link */}
        <p className="text-sm text-center mt-4">
          <Link
            to="/login"
            className="text-brand-600 hover:text-brand-700 font-medium transition"
          >
            Back to Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
