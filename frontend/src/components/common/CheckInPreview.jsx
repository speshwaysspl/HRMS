import React, { useEffect, useState } from "react";
import { FiCalendar, FiFileText, FiMapPin } from "react-icons/fi";
import { MdFingerprint } from "react-icons/md";

// Decorative product preview — the check-in card employees see after signing
// in (live clock) plus Leave / Payslips chips. Shared by Login and Home.

export const useNow = (intervalMs = 15000) => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
};

export const formatClock = (now) => {
  const [clock, meridiem = ""] = now
    .toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true })
    .split(" ");
  return { clock, meridiem: meridiem.toUpperCase() };
};

export const PreviewChip = ({ icon: Icon, title, sub }) => (
  <div className="flex min-w-0 flex-1 items-center gap-2.5 rounded-2xl bg-white py-2 pl-2 pr-3 text-ink shadow-[0_24px_48px_-20px_rgba(5,3,20,0.7)] lg:py-2.5 lg:pr-4">
    <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl bg-accent-50 text-accent-600">
      <Icon size={16} />
    </span>
    <span className="min-w-0">
      <strong className="block text-sm">{title}</strong>
      <small className="block truncate text-xs text-ink-muted">{sub}</small>
    </span>
  </div>
);

export const PreviewChips = ({ className = "" }) => (
  <div className={`flex w-full gap-3 ${className}`}>
    <PreviewChip icon={FiCalendar} title="Leave" sub="Apply in seconds" />
    <PreviewChip icon={FiFileText} title="Payslips" sub="Every month" />
  </div>
);

export const CheckInCard = ({ now, className = "" }) => {
  const { clock, meridiem } = formatClock(now);
  return (
    <div className={`w-full max-w-[340px] rounded-3xl bg-white p-[clamp(18px,3vh,26px)] text-ink shadow-[0_40px_80px_-30px_rgba(5,3,20,0.75)] ${className}`}>
      <div className="flex items-center justify-between text-sm font-semibold">
        <span>Today</span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs text-amber-800">
          <i className="h-1.5 w-1.5 rounded-full bg-amber-600" /> Not checked in
        </span>
      </div>
      <div className="mb-1.5 mt-[clamp(10px,2vh,18px)] flex items-baseline gap-2 text-[clamp(2.75rem,8vh,4rem)] font-bold leading-none tracking-[-0.04em] tabular-nums">
        {clock}
        <small className="text-[0.3em] tracking-normal text-ink-muted">{meridiem}</small>
      </div>
      <div className="flex items-center gap-1.5 text-[13px] text-ink-muted">
        <FiMapPin size={14} /> Location verified at check-in
      </div>
      <div className="mt-[clamp(14px,2.6vh,22px)] flex h-[52px] items-center justify-center gap-2.5 rounded-2xl bg-accent-600 font-semibold text-white">
        <MdFingerprint size={22} /> Check in
      </div>
    </div>
  );
};

/** Dark brand surface used by the login story panel and the home hero. */
export const STORY_BG = {
  background:
    "radial-gradient(60% 50% at 85% 10%, rgba(92,111,171,0.45) 0%, transparent 70%), radial-gradient(55% 45% at 10% 95%, rgba(63,139,69,0.45) 0%, transparent 70%), #0E1122",
};
