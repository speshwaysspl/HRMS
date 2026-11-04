import React from "react";
import { FiCheck, FiFileText, FiUsers } from "react-icons/fi";

// Home hero preview — a different idea from the login's check-in card:
// the app's live activity feed (what lands on your phone) over a this-week
// attendance strip. Decorative; dates are computed so it never looks stale.

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

const nextFriday = (now) => {
  const d = new Date(now);
  d.setDate(d.getDate() + ((5 - d.getDay() + 7) % 7 || 7));
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

const lastMonth = (now) =>
  new Date(now.getFullYear(), now.getMonth() - 1, 1).toLocaleDateString("en-IN", { month: "long" });

const FeedItem = ({ icon: Icon, tone, title, sub, time, className = "" }) => (
  <div className={`flex items-center gap-3 rounded-2xl bg-white p-3.5 text-ink shadow-[0_24px_48px_-24px_rgba(5,3,20,0.75)] ${className}`}>
    <span className={`grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl ${tone}`}>
      <Icon size={18} />
    </span>
    <span className="min-w-0 flex-1">
      <strong className="block truncate text-sm font-semibold">{title}</strong>
      <small className="block truncate text-[13px] text-ink-muted">{sub}</small>
    </span>
    <span className="self-start text-xs text-ink-faint">{time}</span>
  </div>
);

const ActivityPreview = ({ now }) => {
  // Mon..today worked, rest of the week still ahead (weekends show a full week).
  const today = now.getDay(); // 0 Sun … 6 Sat
  const status = DAYS.map((_, i) => {
    const dayNum = i + 1;
    if (today === 0 || today === 6 || dayNum < today) return "present";
    if (dayNum === today) return "today";
    return "upcoming";
  });

  return (
    <div className="relative mx-auto w-full max-w-[400px]" aria-hidden="true">
      <div className="flex flex-col gap-3">
        <FeedItem
          icon={FiCheck}
          tone="bg-accent-50 text-accent-600"
          title="Leave approved"
          sub={`Casual leave · Fri, ${nextFriday(now)}`}
          time="now"
        />
        <FeedItem
          icon={FiFileText}
          tone="bg-brand-50 text-brand-600"
          title={`${lastMonth(now)} payslip is ready`}
          sub="Tap to download the PDF"
          time="2m"
          className="lg:ml-8"
        />
        <FeedItem
          icon={FiUsers}
          tone="bg-amber-50 text-amber-700"
          title="Team check-ins"
          sub="18 of 20 checked in today"
          time="9:42"
        />
      </div>

      {/* This-week attendance strip */}
      <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.06] p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-white">This week</span>
          <span className="text-brand-200">Attendance</span>
        </div>
        <div className="mt-3 grid grid-cols-5 gap-2">
          {DAYS.map((d, i) => (
            <div key={d} className="flex flex-col items-center gap-1.5">
              <span
                className={`h-9 w-full rounded-lg ${
                  status[i] === "present"
                    ? "bg-accent-500"
                    : status[i] === "today"
                    ? "bg-accent-300 ring-2 ring-white/70"
                    : "bg-white/10"
                }`}
              />
              <span className={`text-xs ${status[i] === "today" ? "font-semibold text-white" : "text-brand-200"}`}>{d}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ActivityPreview;
