import React, { useEffect, useState } from "react";
import axios from "axios";
import { FaKey } from "react-icons/fa";
import { API_BASE } from "../../utils/apiConfig";
import { PasswordField, PasswordRules, passwordRules } from "./PasswordField";

const auth = () => ({ headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` } });
const fmt = (d) => new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
const EMPTY = { adminPassword: "", newPassword: "", confirm: "" };

// Admin only: set / change the root password that signs in to any employee
// account with that employee's email. Mirrors mobile settings_screen.dart.
const RootPasswordCard = () => {
  const [info, setInfo] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/api/setting/root-password`, auth());
      setInfo(data);
    } catch {
      setInfo({ isSet: false });
    }
  };
  useEffect(() => { load(); }, []);

  const set = (k) => (e) => { setForm({ ...form, [k]: e.target.value }); setError(""); };
  const mismatch = form.confirm && form.confirm !== form.newPassword;

  const submit = async (e) => {
    e.preventDefault();
    if (!passwordRules(form.newPassword).every((r) => r.ok)) return setError("Root password doesn't meet all the requirements.");
    if (form.newPassword !== form.confirm) return setError("Root passwords do not match.");
    setSaving(true);
    try {
      await axios.put(`${API_BASE}/api/setting/root-password`, { adminPassword: form.adminPassword, newPassword: form.newPassword }, auth());
      setSuccess(info?.isSet ? "Root password changed." : "Root password set.");
      setForm(EMPTY);
      setEditing(false);
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Could not save root password");
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => { setEditing(false); setForm(EMPTY); setError(""); };

  return (
    <section aria-labelledby="root-pw-heading" className="rounded-xl border border-surface-subtle bg-white p-5 sm:p-6 shadow-card">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-subtle text-ink"><FaKey aria-hidden="true" /></span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 id="root-pw-heading" className="font-semibold text-ink">Root password</h3>
            {info && (
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${info.isSet ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-800"}`}>
                {info.isSet ? "Active" : "Not set"}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-ink-muted max-w-[60ch]">
            Sign in to any employee account with their email and this password. It doesn't work for admin accounts, and every use is logged.
          </p>
          {info?.isSet && (
            <p className="mt-1 text-xs text-ink-muted">
              Last changed {fmt(info.updatedAt)}{info.updatedBy ? ` by ${info.updatedBy}` : ""}
            </p>
          )}
        </div>
      </div>

      {success && !editing && <p role="status" className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-800">{success}</p>}

      {editing ? (
        <form onSubmit={submit} className="mt-5 space-y-4" noValidate>
          <PasswordField id="root-admin-pw" label="Your admin password" autoComplete="current-password" value={form.adminPassword} onChange={set("adminPassword")} required autoFocus />
          <PasswordField id="root-new-pw" label="New root password" value={form.newPassword} onChange={set("newPassword")} required />
          {form.newPassword && <PasswordRules value={form.newPassword} />}
          <PasswordField id="root-confirm-pw" label="Confirm root password" value={form.confirm} onChange={set("confirm")} error={mismatch ? "Passwords do not match" : ""} required />
          {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={cancel} className="rounded-lg border border-surface-subtle px-5 py-2.5 text-sm font-semibold text-ink hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-accent-500 outline-none">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !form.adminPassword || !form.newPassword || !form.confirm}
              className="rounded-lg bg-accent-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-700 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : info?.isSet ? "Change root password" : "Set root password"}
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-4 flex sm:justify-end">
          <button
            onClick={() => { setEditing(true); setSuccess(""); }}
            className="w-full sm:w-auto rounded-lg border border-surface-subtle px-5 py-2.5 text-sm font-semibold text-ink hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-accent-500 outline-none"
          >
            {info?.isSet ? "Edit root password" : "Set root password"}
          </button>
        </div>
      )}

      {info?.recentLogins?.length > 0 && (
        <details className="mt-5 border-t border-surface-subtle pt-4">
          <summary className="cursor-pointer text-sm font-medium text-accent-700">Recent root logins ({info.recentLogins.length})</summary>
          <ul className="mt-2 divide-y divide-surface-subtle text-sm">
            {info.recentLogins.map((l, i) => (
              <li key={i} className="flex justify-between gap-3 py-2">
                <span className="truncate text-ink">{l.email}</span>
                <span className="shrink-0 text-ink-muted tabular-nums">{fmt(l.at)}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
};

export default RootPasswordCard;
