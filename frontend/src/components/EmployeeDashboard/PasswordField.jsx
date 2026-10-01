import React, { useState } from "react";
import { FaEye, FaEyeSlash, FaCheck } from "react-icons/fa";

// Labelled password input with its own show/hide toggle.
export const PasswordField = ({ id, label, value, onChange, autoComplete = "new-password", error, ...rest }) => {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-ink">{label}</label>
      <div className="relative mt-1.5">
        <input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-err` : undefined}
          className={`w-full rounded-lg border bg-white px-3 py-2.5 pr-11 text-sm text-ink outline-none transition focus:ring-2 focus:ring-accent-500 ${error ? "border-red-400" : "border-surface-subtle"}`}
          {...rest}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          aria-pressed={show}
          className="absolute right-1 top-1/2 -translate-y-1/2 grid h-9 w-9 place-items-center rounded-md text-ink-muted hover:text-ink hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-accent-500 outline-none"
        >
          {show ? <FaEyeSlash aria-hidden="true" /> : <FaEye aria-hidden="true" />}
        </button>
      </div>
      {error && <p id={`${id}-err`} className="mt-1 text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
};

export const passwordRules = (pwd = "") => [
  { label: "8–18 characters", ok: pwd.length >= 8 && pwd.length <= 18 },
  { label: "Uppercase letter", ok: /[A-Z]/.test(pwd) },
  { label: "Lowercase letter", ok: /[a-z]/.test(pwd) },
  { label: "Number", ok: /[0-9]/.test(pwd) },
  { label: "Special character", ok: /[^A-Za-z0-9]/.test(pwd) },
];

// Live checklist of the password rules.
export const PasswordRules = ({ value }) => (
  <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs" aria-label="Password requirements">
    {passwordRules(value).map((r) => (
      <li key={r.label} className={`flex items-center gap-1.5 ${r.ok ? "text-green-700" : "text-ink-muted"}`}>
        <FaCheck aria-hidden="true" className={r.ok ? "" : "opacity-25"} />
        {r.label}
        <span className="sr-only">{r.ok ? "(met)" : "(not met)"}</span>
      </li>
    ))}
  </ul>
);
