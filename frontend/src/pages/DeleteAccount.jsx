import React, { useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import PublicHeader from "../components/common/PublicHeader";
import PublicFooter from "../components/common/PublicFooter";
import useMeta from "../utils/useMeta";

const DeleteAccount = () => {
  useMeta({
    title: "Request Account Deletion — Speshway HRMS",
    description: "Submit a request to delete your Speshway HRMS employee account and personal data. Handled and verified by your organization HR/Admin.",
    keywords: "Speshway delete account, account deletion, HRMS data deletion, employee account removal",
    url: `${window.location.origin}/delete-account`,
  });

  const [identifier, setIdentifier] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setErrorMessage("Please enter your registered email address or Employee ID.");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || "/api";
      const res = await axios.post(`${apiBase}/account/deletion-request`, {
        identifier: identifier.trim(),
        reason: reason.trim() || undefined,
      });

      if (res.data?.success) {
        setSuccessMessage(
          res.data.message ||
            "Your deletion request has been received. Your organization's HR/Admin will review and verify your request to process account and eligible data deletion."
        );
        setIdentifier("");
        setReason("");
      } else {
        setErrorMessage(res.data?.error || "Failed to submit request. Please try again.");
      }
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Could not submit request. Please verify your details or contact your HR administrator.";
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      <PublicHeader />

      <main className="flex-grow container mx-auto px-4 py-12 max-w-3xl">
        {/* Header Title */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold mb-3">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Account &amp; Data Deletion
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-brand-900 tracking-tight mb-3">
            Delete Your Employee Account
          </h1>
          <p className="text-slate-600 max-w-xl mx-auto text-sm sm:text-base leading-relaxed">
            Speshway HRMS is an enterprise workplace platform. To safeguard employment and compliance records, all account deletion requests are reviewed and fulfilled by your organization’s authorized HR or System Administrator.
          </p>
        </div>

        {/* 4-Step Process Card */}
        <div className="bg-white rounded-2xl p-6 mb-8 shadow-sm border border-slate-200/80">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 text-center">
            How Account Deletion Works
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-center">
            <div className="flex flex-col items-center p-3 rounded-xl bg-slate-50">
              <span className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 font-bold flex items-center justify-center text-sm mb-2">1</span>
              <h3 className="font-semibold text-xs text-slate-800">Employee Request</h3>
              <p className="text-[11px] text-slate-500 mt-1">Submit your email or Employee ID below.</p>
            </div>
            <div className="flex flex-col items-center p-3 rounded-xl bg-slate-50">
              <span className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 font-bold flex items-center justify-center text-sm mb-2">2</span>
              <h3 className="font-semibold text-xs text-slate-800">HR/Admin Receives</h3>
              <p className="text-[11px] text-slate-500 mt-1">Admin gets an instant notification alert.</p>
            </div>
            <div className="flex flex-col items-center p-3 rounded-xl bg-slate-50">
              <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm mb-2">3</span>
              <h3 className="font-semibold text-xs text-slate-800">Admin Verifies</h3>
              <p className="text-[11px] text-slate-500 mt-1">Identity &amp; employment status validated.</p>
            </div>
            <div className="flex flex-col items-center p-3 rounded-xl bg-slate-50">
              <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-sm mb-2">4</span>
              <h3 className="font-semibold text-xs text-slate-800">Data Deleted</h3>
              <p className="text-[11px] text-slate-500 mt-1">Account &amp; eligible personal data purged.</p>
            </div>
          </div>
        </div>

        {/* Submission Form Card */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200/80">
          {successMessage ? (
            <div className="p-6 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-emerald-900 mb-2">Request Submitted Successfully</h3>
              <p className="text-sm text-emerald-800 leading-relaxed max-w-lg mx-auto mb-4">
                {successMessage}
              </p>
              <button
                type="button"
                onClick={() => setSuccessMessage("")}
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-emerald-600 text-white font-medium text-xs hover:bg-emerald-700 transition"
              >
                Submit another request
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {errorMessage && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3">
                  <svg className="w-5 h-5 flex-shrink-0 text-rose-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>{errorMessage}</div>
                </div>
              )}

              <div>
                <label htmlFor="identifier" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Enter your registered email / employee ID <span className="text-rose-500">*</span>
                </label>
                <input
                  id="identifier"
                  type="text"
                  required
                  placeholder="e.g. employee@company.com or EMP-1042"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition"
                />
              </div>

              <div>
                <label htmlFor="reason" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Reason for Deletion <span className="text-slate-400 normal-case font-normal">(Optional)</span>
                </label>
                <textarea
                  id="reason"
                  rows={3}
                  placeholder="e.g. Resigned from company, requesting data purge..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 px-6 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-sm tracking-wide transition shadow-sm hover:shadow flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Submitting Request...
                    </>
                  ) : (
                    "Submit Deletion Request"
                  )}
                </button>
              </div>

              <p className="text-[12px] text-slate-500 text-center leading-normal pt-2">
                By submitting this form, you request your employer to delete your login credentials and personal records. In accordance with applicable labor and tax laws, some payroll/tax history may be retained by your employer for statutory audit periods. See our{" "}
                <Link to="/privacy-policy" className="text-brand-600 underline hover:text-brand-800">
                  Privacy Policy
                </Link>{" "}
                for full retention disclosures.
              </p>
            </form>
          )}
        </div>
      </main>

      <PublicFooter />
    </div>
  );
};

export default DeleteAccount;
