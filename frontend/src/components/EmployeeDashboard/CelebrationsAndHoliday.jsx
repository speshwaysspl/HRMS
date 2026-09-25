import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_BASE } from "../../utils/apiConfig";
import { toISTDateString } from "../../utils/dateTimeUtils";
import { useNavigate } from "react-router-dom";
import { FiGift, FiAward, FiClock, FiChevronRight } from "react-icons/fi";
import { MdOutlineCelebration } from "react-icons/md";

// Dashboard strip: next holiday countdown + today's birthdays / work
// anniversaries with a one-tap "Wish" button.
// Mirrors mobile/lib/widgets/celebrations_card.dart.

const authHeaders = () => ({ Authorization: `Bearer ${sessionStorage.getItem("token")}` });

const daysUntil = (dateStr) => {
  const today = new Date(`${toISTDateString(new Date())}T00:00:00Z`);
  return Math.round((new Date(`${dateStr}T00:00:00Z`) - today) / 86400000);
};

const CelebrationsAndHoliday = () => {
  const [holiday, setHoliday] = useState(null);
  const [people, setPeople] = useState([]);
  const [sending, setSending] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const today = toISTDateString(new Date());
    axios
      .get(`${API_BASE}/api/events`, { headers: authHeaders() })
      .then(({ data }) => {
        const next = (data.events || [])
          .filter((e) => e.type === "holiday")
          .map((e) => ({ title: e.title, description: e.description || "", date: new Date(e.date).toISOString().slice(0, 10) }))
          .filter((e) => e.date >= today)
          .sort((a, b) => a.date.localeCompare(b.date))[0];
        setHoliday(next || null);
      })
      .catch(() => {});

    axios
      .get(`${API_BASE}/api/birthdays/celebrations`, { headers: authHeaders() })
      .then(({ data }) =>
        setPeople([
          ...(data.birthdays || []).map((p) => ({ ...p, kind: "birthday" })),
          ...(data.anniversaries || []).map((p) => ({ ...p, kind: "anniversary" })),
        ])
      )
      .catch(() => {});
  }, []);

  const wish = async (p) => {
    setSending(`${p.kind}-${p.userId}`);
    try {
      await axios.post(`${API_BASE}/api/birthdays/wish/${p.userId}`, { kind: p.kind }, { headers: authHeaders() });
      setPeople((prev) => prev.map((x) => (x.userId === p.userId ? { ...x, wished: true } : x)));
    } catch {
      alert("Couldn't send your wish. Please try again.");
    } finally {
      setSending(null);
    }
  };

  if (!holiday && people.length === 0) return null;

  const days = holiday ? daysUntil(holiday.date) : null;

  return (
    <div className="space-y-6">
      {holiday && (
        <div>
          {/* Same look as "Recent Announcements"; opens Calendar & Holidays. */}
          <h2 className="text-xl md:text-2xl font-semibold text-ink mb-4 flex items-center gap-2">
            <MdOutlineCelebration className="text-ink" />
            Next Holiday
          </h2>
          <button
            type="button"
            onClick={() => navigate("/employee-dashboard/calendar")}
            className="w-full text-left rounded-2xl p-4 border border-surface-subtle bg-surface hover:shadow-panel transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-lg bg-brand-50 flex flex-col items-center justify-center flex-shrink-0 leading-none">
                <span className="text-[10px] font-bold text-brand-600 uppercase">
                  {new Date(`${holiday.date}T00:00:00Z`).toLocaleDateString("en-IN", { month: "short", timeZone: "UTC" })}
                </span>
                <span className="text-lg font-extrabold text-ink tabular-nums mt-0.5">{Number(holiday.date.slice(8, 10))}</span>
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10.5px] font-bold uppercase tracking-wide text-brand-600">Holiday</span>
                <div className="font-bold text-ink text-sm leading-snug line-clamp-2 mt-0.5">{holiday.title}</div>
                <div className="text-ink-muted text-xs leading-relaxed line-clamp-2 mt-1.5">
                  {new Date(`${holiday.date}T00:00:00Z`).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })}
                  {holiday.description ? ` · ${holiday.description}` : ""}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between mt-3">
              <span className="inline-flex items-center gap-1.5 text-xs text-ink-faint">
                <FiClock size={11} />
                {days === 0 ? "Today" : days === 1 ? "Tomorrow" : `In ${days} days`}
              </span>
              <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-brand-500">
                View calendar
                <FiChevronRight size={12} />
              </span>
            </div>
          </button>
        </div>
      )}

      {people.length > 0 && (
        <div className="bg-white rounded-2xl border border-surface-subtle p-5">
          <p className="text-xs font-semibold text-ink-muted mb-3">Celebrating today</p>
          <ul className="space-y-3">
            {people.map((p) => {
              const Icon = p.kind === "birthday" ? FiGift : FiAward;
              const key = `${p.kind}-${p.userId}`;
              return (
                <li key={key} className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-full bg-surface-muted flex items-center justify-center flex-shrink-0 text-ink">
                    <Icon size={18} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-ink truncate">{p.isMe ? "You" : p.name}</p>
                    <p className="text-sm text-ink-muted truncate">
                      {p.kind === "birthday" ? "Birthday" : `${p.years} year${p.years > 1 ? "s" : ""} at Speshway`}
                    </p>
                  </div>
                  {!p.isMe && (
                    <button
                      type="button"
                      onClick={() => wish(p)}
                      disabled={p.wished || sending === key}
                      className={`min-h-[40px] px-4 rounded-lg text-sm font-semibold flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                        p.wished ? "bg-surface-muted text-ink-muted" : "bg-ink text-white hover:opacity-90"
                      } disabled:cursor-default`}
                    >
                      {p.wished ? "Wished ✓" : sending === key ? "Sending…" : "Wish"}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

export default CelebrationsAndHoliday;
