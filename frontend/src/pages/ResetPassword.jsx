import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE } from "../utils/apiConfig";
 
export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
 
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
 
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
    <div
      className="flex items-center justify-center min-h-screen bg-cover bg-center"
      style={{ backgroundImage: "url('/images/download.jpeg')" }}
    >
      <div className="w-full max-w-md bg-white/10 backdrop-blur-xl shadow-lg rounded-xl p-6 border border-white/20">
        <h2 className="text-2xl font-bold text-center text-white mb-4 drop-shadow-lg">
          Reset Your Password
        </h2>
 
        {error && (
          <div className="bg-red-100/70 text-red-900 px-4 py-2 rounded-md mb-4">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-100/70 text-green-900 px-4 py-2 rounded-md mb-4">
            {success}
          </div>
        )}
 
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            placeholder="New Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-gray-300/50 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white/60"
          />
 
          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
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
            {loading ? "Resetting..." : "Reset Password"}
          </button>
        </form>
 
        <p className="text-sm text-white/80 text-center mt-4">
          Enter your new password and confirm to reset.
        </p>
      </div>
    </div>
  );
}
 