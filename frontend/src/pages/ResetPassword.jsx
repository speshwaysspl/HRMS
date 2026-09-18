import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE } from "../utils/apiConfig";
import useMeta from "../utils/useMeta";
import brandLogo from "../assets/logo.jpg";
 
export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
 
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const canonical = useMemo(() => `${window.location.origin}/reset-password/${token || ""}`,[token]);
  useMeta({
    title: "Reset Password — Speshway HRMS",
    description: "Create a new password for your Speshway HRMS account.",
    keywords: "reset password, HRMS",
    url: canonical,
    image: "/images/Logo.jpg",
    robots: "noindex,nofollow",
  });
 
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
 
    if (!password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
 
    try {
      setLoading(true);
      const res = await axios.post(
        `${API_BASE}/api/auth/reset-password/${token}`,
        { password }
      );
 
      if (res.data.success) {
        setSuccess("Password reset successfully. Redirecting to login...");
        setTimeout(() => navigate("/login"), 2000);
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
            src={brandLogo}
            alt="Speshway HRMS"
            className="h-12 w-auto rounded-md mb-4"
          />
          <h2 className="text-2xl font-semibold text-center text-ink">
            Reset Your Password
          </h2>
          <p className="text-sm text-ink-muted text-center mt-1">
            Enter your new password and confirm to reset.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 border border-red-200 px-4 py-2 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-accent-50 text-accent-700 border border-accent-200 px-4 py-2 rounded-lg mb-4 text-sm">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            placeholder="New Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-surface-subtle rounded-lg px-4 py-2.5 text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />

          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
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
            {loading ? "Resetting..." : "Reset Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
 
