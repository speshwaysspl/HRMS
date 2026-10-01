// Settings page (admin + employee). Layout mirrors mobile settings_screen.dart:
// profile header -> Security -> Support -> Account.
import React, { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { FaPhone, FaEnvelope, FaLinkedin, FaGlobe, FaMapMarkerAlt, FaTrashAlt, FaLock } from "react-icons/fa";
import { API_BASE } from "../../utils/apiConfig";
import useMeta from "../../utils/useMeta";
import RootPasswordCard from "./RootPasswordCard";
import { PasswordField, PasswordRules, passwordRules } from "./PasswordField";

const initials = (name = "") => {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (!p.length) return "?";
  return (p[0][0] + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
};

const SectionLabel = ({ id, children }) => (
  <h2 id={id} className="px-1 mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">{children}</h2>
);

export const Card = ({ children, className = "" }) => (
  <div className={`rounded-xl border border-surface-subtle bg-white shadow-card ${className}`}>{children}</div>
);

const ChangePasswordCard = ({ userId }) => {
  const [form, setForm] = useState({ oldPassword: "", newPassword: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => { setForm({ ...form, [k]: e.target.value }); setError(""); setSuccess(""); };

  const mismatch = form.confirmPassword && form.confirmPassword !== form.newPassword;

  const submit = async (e) => {
    e.preventDefault();
    if (!passwordRules(form.newPassword).every((r) => r.ok)) return setError("New password doesn't meet all the requirements.");
    if (form.oldPassword === form.newPassword) return setError("New password must be different from the current one.");
    if (form.newPassword !== form.confirmPassword) return setError("Passwords do not match.");
    setSaving(true);
    try {
      const { data } = await axios.put(
        `${API_BASE}/api/setting/change-password`,
        { userId, oldPassword: form.oldPassword, newPassword: form.newPassword },
        { headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` } }
      );
      if (data.success) {
        setSuccess("Password updated.");
        setForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
      }
    } catch (err) {
      const msg = String(err.response?.data?.error || "Could not update password");
      setError(msg.includes("wrong") ? "Current password is incorrect." : msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-subtle text-ink"><FaLock aria-hidden="true" /></span>
        <div>
          <h3 className="font-semibold text-ink">Change password</h3>
          <p className="mt-0.5 text-sm text-ink-muted">Use a strong password you don't use anywhere else.</p>
        </div>
      </div>
      <form onSubmit={submit} className="mt-5 space-y-4" noValidate>
        <PasswordField id="cur-pw" label="Current password" autoComplete="current-password" value={form.oldPassword} onChange={set("oldPassword")} required />
        <PasswordField id="new-pw" label="New password" value={form.newPassword} onChange={set("newPassword")} required />
        {form.newPassword && <PasswordRules value={form.newPassword} />}
        <PasswordField id="confirm-pw" label="Confirm new password" value={form.confirmPassword} onChange={set("confirmPassword")} error={mismatch ? "Passwords do not match" : ""} required />
        {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>}
        {success && <p role="status" className="rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-800">{success}</p>}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving || !form.oldPassword || !form.newPassword || !form.confirmPassword}
            className="w-full sm:w-auto rounded-lg bg-accent-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-700 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Updating..." : "Update password"}
          </button>
        </div>
      </form>
    </Card>
  );
};

const SUPPORT = [
  { icon: FaPhone, label: "Phone", value: "+91 9154986733 · +91 9154986732", href: "tel:+919154986733" },
  { icon: FaEnvelope, label: "Email", value: "support@speshwayhrms.com", href: "mailto:support@speshwayhrms.com" },
  { icon: FaGlobe, label: "Website", value: "www.speshway.com", href: "https://speshway.com/" },
  { icon: FaLinkedin, label: "LinkedIn", value: "speshway-solutions", href: "https://www.linkedin.com/in/speshway-solutions-a59366248" },
  { icon: FaMapMarkerAlt, label: "Office", value: "Plot No 1/C, Syno 83/1, Raidurgam, Knowledge City Rd, Panmaktha, Hyderabad, Telangana 500081" },
];

const Setting = () => {
  const { user } = useAuth();
  const isAdmin = user?.role?.includes("admin");
  useMeta({
    title: "Settings — Speshway HRMS",
    description: "Update your account password and preferences.",
    keywords: "settings, account, HRMS",
    image: "/images/Logo.jpg",
    url: `${window.location.origin}/employee-dashboard/setting`,
    robots: "noindex,nofollow",
  });

  return (
    <div className="min-h-screen bg-surface-muted px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-2xl space-y-8">
        <header>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-brand-800">Settings</h1>
          <Card className="mt-5 flex items-center gap-4 p-4 sm:p-5">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand-50 text-base font-bold text-brand-600" aria-hidden="true">
              {initials(user?.name)}
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold text-ink">{user?.name}</p>
              <p className="truncate text-sm text-ink-muted">{user?.email}</p>
            </div>
            {isAdmin && <span className="ml-auto shrink-0 rounded-full bg-accent-50 px-2.5 py-0.5 text-xs font-semibold text-accent-800">Admin</span>}
          </Card>
        </header>

        <section aria-labelledby="sec-security" className="space-y-3">
          <SectionLabel id="sec-security">Security</SectionLabel>
          <ChangePasswordCard userId={user?._id} />
          {isAdmin && <RootPasswordCard />}
        </section>

        <section aria-labelledby="sec-support">
          <SectionLabel id="sec-support">Help &amp; support</SectionLabel>
          <Card>
            <ul className="divide-y divide-surface-subtle">
              {SUPPORT.map(({ icon: Icon, label, value, href }) => {
                const body = (
                  <>
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-subtle text-ink"><Icon aria-hidden="true" /></span>
                    <span className="min-w-0">
                      <span className="block text-xs text-ink-muted">{label}</span>
                      <span className="block text-sm font-medium text-ink break-words">{value}</span>
                    </span>
                  </>
                );
                return (
                  <li key={label}>
                    {href ? (
                      <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="flex min-h-[56px] items-center gap-3 px-4 py-3 hover:bg-surface-muted focus-visible:bg-surface-muted outline-none">
                        {body}
                      </a>
                    ) : (
                      <div className="flex items-start gap-3 px-4 py-3">{body}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>
        </section>

        <section aria-labelledby="sec-account">
          <SectionLabel id="sec-account">Account</SectionLabel>
          <Card className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-semibold text-ink">Request account deletion</h3>
              <p className="mt-0.5 text-sm text-ink-muted">HR/Admin will verify your identity before deleting your account.</p>
            </div>
            <Link
              to="/delete-account"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-red-300 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-500 outline-none"
            >
              <FaTrashAlt aria-hidden="true" size={13} /> Request deletion
            </Link>
          </Card>
        </section>

        <p className="pb-4 text-center text-xs text-ink-muted">© {new Date().getFullYear()} Speshway Solutions Private Limited</p>
      </div>
    </div>
  );
};

export default Setting;
