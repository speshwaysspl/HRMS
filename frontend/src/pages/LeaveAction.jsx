import React, { useEffect, useState } from "react";
import axios from "axios";
import { useSearchParams } from "react-router-dom";
import { API_BASE } from "../utils/apiConfig";
import useMeta from "../utils/useMeta";

const fmt = (d) =>
  new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

const STATUS_STYLE = {
  Approved: "bg-accent-100 text-accent-800",
  Rejected: "bg-red-100 text-red-700",
  Pending: "bg-amber-100 text-amber-800",
};

// Opened from the Approve / Reject buttons in HR's leave email. The signed token in the
// link authorises this one decision, so no login is needed.
const LeaveAction = () => {
  useMeta({ title: "Review Leave Request — Speshway HRMS" });
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [decision, setDecision] = useState(params.get("action") === "reject" ? "Rejected" : "Approved");
  const [leave, setLeave] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [remark, setRemark] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(null);

  useEffect(() => {
    axios
      .get(`${API_BASE}/api/leave/email-action`, { params: { token } })
      .then((res) => setLeave(res.data.leave))
      .catch((err) => setLoadError(err.response?.data?.error || "Could not load this leave request."));
  }, [token]);

  const submit = async (e) => {
    e.preventDefault();
    if (decision === "Rejected" && !remark.trim()) {
      setError("Please give a reason for rejecting.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await axios.post(`${API_BASE}/api/leave/email-action`, { token, status: decision, remark: remark.trim() });
      setDone(decision);
    } catch (err) {
      const data = err.response?.data;
      if (data?.status) setLeave((l) => ({ ...l, status: data.status }));
      setError(data?.error || "Could not save your decision. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const days = leave ? Math.round((new Date(leave.endDate) - new Date(leave.startDate)) / 86400000) + 1 : 0;
  const decided = leave && leave.status !== "Pending";

  return (
    <main className="min-h-screen bg-surface-muted flex items-start sm:items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg bg-white rounded-2xl border border-surface-subtle shadow-card overflow-hidden">
        <header className="bg-brand-900 px-6 py-5">
          <p className="text-white font-bold tracking-wide">SPESHWAY SOLUTIONS</p>
          <h1 className="text-white/80 text-sm mt-1">Review leave request</h1>
        </header>

        <div className="p-6">
          {loadError ? (
            <p role="alert" className="text-sm text-red-700">{loadError}</p>
          ) : !leave ? (
            <p className="text-sm text-ink-muted">Loading leave request...</p>
          ) : done ? (
            <div role="status" className="text-center py-6">
              <p className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ${STATUS_STYLE[done]}`}>{done}</p>
              <p className="mt-3 text-ink font-semibold">
                Leave {done.toLowerCase()} for {leave.employeeName}.
              </p>
              <p className="mt-1 text-sm text-ink-muted">The employee has been notified in the app. You can close this page.</p>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-ink truncate">{leave.employeeName}</h2>
                  {leave.employeeCode && <p className="text-sm text-ink-muted">ID {leave.employeeCode}</p>}
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[leave.status]}`}>
                  {leave.status}
                </span>
              </div>

              <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                <dt className="text-ink-muted">Leave type</dt>
                <dd className="text-ink font-medium">{leave.leaveType}</dd>
                <dt className="text-ink-muted">Dates</dt>
                <dd className="text-ink font-medium tabular-nums">
                  {fmt(leave.startDate)} – {fmt(leave.endDate)} ({days} day{days === 1 ? "" : "s"})
                </dd>
                <dt className="text-ink-muted">Reason</dt>
                <dd className="text-ink whitespace-pre-wrap break-words">{leave.reason}</dd>
                {leave.proof && (
                  <>
                    <dt className="text-ink-muted">Proof</dt>
                    <dd>
                      <a
                        href={leave.proof.startsWith("http") ? leave.proof : `${API_BASE}/${leave.proof}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-accent-700 underline underline-offset-2 break-all"
                      >
                        {leave.proofName || "View proof"}
                      </a>
                    </dd>
                  </>
                )}
                {decided && leave.reviewRemark && (
                  <>
                    <dt className="text-ink-muted">Remark</dt>
                    <dd className="text-ink whitespace-pre-wrap break-words">{leave.reviewRemark}</dd>
                  </>
                )}
              </dl>

              {decided ? (
                <p role="status" className="mt-6 text-sm text-ink-muted">
                  This request has already been {leave.status.toLowerCase()}. No further action is needed.
                </p>
              ) : (
                <form onSubmit={submit} className="mt-6 space-y-4">
                  <fieldset>
                    <legend className="text-sm font-medium text-ink mb-2">Decision</legend>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        ["Approved", "Approve", "peer-checked:bg-accent-600 peer-checked:border-accent-600"],
                        ["Rejected", "Reject", "peer-checked:bg-red-600 peer-checked:border-red-600"],
                      ].map(([value, label, on]) => (
                        <label key={value} className="cursor-pointer">
                          <input
                            type="radio"
                            name="decision"
                            value={value}
                            checked={decision === value}
                            onChange={() => {
                              setDecision(value);
                              setError("");
                            }}
                            className="peer sr-only"
                          />
                          <span
                            className={`flex min-h-[44px] items-center justify-center rounded-lg border border-surface-subtle text-sm font-semibold text-ink peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-accent-500 ${on}`}
                          >
                            {label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <div>
                    <label htmlFor="remark" className="block text-sm font-medium text-ink mb-1">
                      {decision === "Rejected" ? "Reason for rejecting" : "Remark (optional)"}
                    </label>
                    <textarea
                      id="remark"
                      rows={3}
                      maxLength={500}
                      value={remark}
                      onChange={(e) => {
                        setRemark(e.target.value);
                        setError("");
                      }}
                      aria-invalid={!!error}
                      placeholder={decision === "Rejected" ? "Tell the employee why" : "Add a note for the employee"}
                      className="w-full rounded-lg border border-surface-subtle px-3 py-2 text-sm text-ink bg-white focus:ring-2 focus:ring-accent-500 outline-none"
                    />
                  </div>

                  {error && <p role="alert" className="text-sm text-red-700">{error}</p>}

                  <button
                    type="submit"
                    disabled={submitting}
                    className={`w-full min-h-[48px] rounded-lg text-white text-sm font-semibold disabled:opacity-60 ${
                      decision === "Rejected" ? "bg-red-600 hover:bg-red-700" : "bg-accent-600 hover:bg-accent-700"
                    }`}
                  >
                    {submitting ? "Saving..." : decision === "Rejected" ? "Reject leave" : "Approve leave"}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
};

export default LeaveAction;
