import React, { useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom"; // ✅ Import Link
import { API_BASE } from "../utils/apiConfig";

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
    <div
      className="flex items-center justify-center min-h-screen bg-cover bg-center"
      style={{ backgroundImage: "url('/images/download.jpeg')" }}
    >
      <div className="w-full max-w-md bg-white/10 backdrop-blur-xl shadow-lg rounded-xl p-6 border border-white/20">
        <h2 className="text-2xl font-bold text-center text-white mb-4 drop-shadow-lg">
          Forgot Password
        </h2>

        {message && (
          <div className="bg-green-100/70 text-green-900 px-4 py-2 rounded-md mb-4">
            {message}
          </div>
        )}

        {error && (
          <div className="bg-red-100/70 text-red-900 px-4 py-2 rounded-md mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Enter your registered email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-300/50 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white/60"
          />

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 rounded-lg text-white font-medium transition ${
              loading
                ? "bg-indigo-400 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-700"
            }`}
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        <p className="text-sm text-white/80 text-center mt-4">
          We’ll send a password reset link to your email.
        </p>

        {/* ✅ Back to Login Link */}
        <p className="text-sm text-center mt-4">
          <Link
            to="/login"
            className="text-indigo-300 hover:text-indigo-100 transition"
          >
            Back to Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
