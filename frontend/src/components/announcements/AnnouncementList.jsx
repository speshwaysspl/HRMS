// src/components/announcement/AnnouncementList.jsx
import React, { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { FaPlus, FaPen, FaTrash, FaClock, FaImage, FaBullhorn } from "react-icons/fa";
import { fetchAnnouncements } from "../../utils/AnnouncementHelper";
import { API_BASE } from "../../utils/apiConfig";
import { formatISTDate } from "../../utils/dateTimeUtils";
import useMeta from "../../utils/useMeta";
import { ANNOUNCEMENT_CATEGORIES, CATEGORY_ICONS } from "./AnnouncementAdd";

const AUDIENCE = {
  all: "All employees",
  team_leads: "Team leads",
  team_members: "Team members",
  specific: "Specific people",
};
const audienceLabel = (a) => (a.scope === "team" ? `Team: ${a.targetTeam?.name || "Team"}` : AUDIENCE[a.scope] || "All employees");
const isScheduled = (a) => a.published === false;
const fmtDateTime = (d) => new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

const AnnouncementList = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all"); // all | published | scheduled
  const [type, setType] = useState("all");
  const [deletingId, setDeletingId] = useState(null);
  const [deletingAll, setDeletingAll] = useState(false);

  const canonical = useMemo(() => `${window.location.origin}/admin-dashboard/announcements`, []);
  useMeta({
    title: "Announcements — Speshway HRMS",
    description: "Browse and manage company announcements.",
    keywords: "announcements, HRMS",
    url: canonical,
    image: "/images/Logo.jpg",
  });

  useEffect(() => {
    (async () => {
      setItems(await fetchAnnouncements());
      setLoading(false);
    })();
  }, []);

  const scheduledCount = items.filter(isScheduled).length;
  const q = search.trim().toLowerCase();
  const visible = items
    .filter((a) => status === "all" || (status === "scheduled" ? isScheduled(a) : !isScheduled(a)))
    .filter((a) => type === "all" || (a.category || "important") === type)
    .filter((a) => !q || a.title?.toLowerCase().includes(q) || a.description?.toLowerCase().includes(q))
    // Scheduled first (soonest on top), then published newest first.
    .sort((a, b) => {
      if (isScheduled(a) !== isScheduled(b)) return isScheduled(a) ? -1 : 1;
      if (isScheduled(a)) return new Date(a.scheduledAt) - new Date(b.scheduledAt);
      return new Date(b.publishedAt || b.createdAt) - new Date(a.publishedAt || a.createdAt);
    });
  const filtered = !!q || status !== "all" || type !== "all";

  const handleDelete = async (a) => {
    if (!window.confirm(`Delete "${a.title}"? This can't be undone.`)) return;
    setDeletingId(a._id);
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      await axios.delete(`${API_BASE}/api/announcement/${a._id}`, { headers: { Authorization: `Bearer ${token}` } });
      setItems((prev) => prev.filter((x) => x._id !== a._id));
    } catch (err) {
      alert(err.response?.data?.error || "Could not delete announcement");
    } finally {
      setDeletingId(null);
    }
  };

  // Deletes every announcement in the current view (all, or what the filters show).
  const handleDeleteAll = async () => {
    const n = visible.length;
    if (!window.confirm(`Delete ${n === items.length ? "all" : "these"} ${n} announcement${n === 1 ? "" : "s"}? This can't be undone.`)) return;
    setDeletingAll(true);
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      const { data } = await axios.post(
        `${API_BASE}/api/announcement/bulk-delete`,
        { ids: visible.map((a) => a._id) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const gone = new Set(data.deleted);
      setItems((prev) => prev.filter((x) => !gone.has(x._id)));
      if (data.skipped) alert(`${data.skipped} announcement${data.skipped === 1 ? " was" : "s were"} posted by someone else and kept.`);
    } catch (err) {
      alert(err.response?.data?.error || "Could not delete announcements");
    } finally {
      setDeletingAll(false);
    }
  };

  const statusTabs = [
    { id: "all", label: "All", count: items.length },
    { id: "published", label: "Published", count: items.length - scheduledCount },
    { id: "scheduled", label: "Scheduled", count: scheduledCount },
  ];

  return (
    <div className="min-h-screen bg-surface-muted px-4 py-5 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-brand-800">Announcements</h1>
            <p className="mt-1 text-sm text-ink-muted">
              {scheduledCount > 0 ? `${scheduledCount} scheduled to go out · ` : ""}
              {items.length - scheduledCount} published
            </p>
          </div>
          <Link
            to="/admin-dashboard/announcements/add"
            className="inline-flex items-center gap-2 rounded-lg bg-accent-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-700 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent-500 outline-none"
          >
            <FaPlus aria-hidden="true" /> New announcement
          </Link>
        </div>

        <div className="rounded-xl border border-surface-subtle bg-white shadow-card">
          {/* Toolbar */}
          <div className="flex flex-col gap-3 border-b border-surface-subtle p-3 sm:p-4 md:flex-row md:items-center md:justify-between">
            <div role="tablist" aria-label="Status" className="flex gap-1 overflow-x-auto">
              {statusTabs.map((t) => {
                const active = status === t.id;
                return (
                  <button
                    key={t.id}
                    role="tab"
                    aria-selected={active}
                    onClick={() => setStatus(t.id)}
                    className={`shrink-0 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent-500 ${
                      active ? "bg-accent-50 text-accent-800" : "text-ink-muted hover:bg-surface-muted hover:text-ink"
                    }`}
                  >
                    {t.label}
                    <span className={`rounded-full px-1.5 text-xs tabular-nums ${active ? "bg-accent-100" : "bg-surface-subtle"}`}>{t.count}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <label htmlFor="ann-type" className="sr-only">Type</label>
              <select
                id="ann-type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="rounded-lg border border-surface-subtle bg-white px-3 py-2 text-sm text-ink focus:border-accent-500 focus:ring-2 focus:ring-accent-500/30 outline-none"
              >
                <option value="all">All types</option>
                {ANNOUNCEMENT_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
              <input
                type="search"
                aria-label="Search announcements"
                placeholder="Search title or message"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full sm:w-64 rounded-lg border border-surface-subtle px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-accent-500 focus:ring-2 focus:ring-accent-500/30 outline-none"
              />
              {!loading && visible.length > 0 && (
                <button
                  onClick={handleDeleteAll}
                  disabled={deletingAll}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-500 outline-none disabled:opacity-50"
                >
                  <FaTrash aria-hidden="true" />
                  {deletingAll ? "Deleting..." : `Delete ${filtered ? "these" : "all"} (${visible.length})`}
                </button>
              )}
            </div>
          </div>

          {/* List */}
          {loading ? (
            <ul aria-busy="true" className="divide-y divide-surface-subtle">
              {[0, 1, 2, 3].map((i) => (
                <li key={i} className="flex gap-4 p-4">
                  <div className="h-14 w-14 shrink-0 animate-pulse rounded-lg bg-surface-subtle" />
                  <div className="flex-1 space-y-2 py-1">
                    <div className="h-4 w-1/2 animate-pulse rounded bg-surface-subtle" />
                    <div className="h-3 w-3/4 animate-pulse rounded bg-surface-subtle" />
                  </div>
                </li>
              ))}
            </ul>
          ) : visible.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent-50 text-accent-700">
                <FaBullhorn aria-hidden="true" />
              </div>
              <p className="font-semibold text-ink">{filtered ? "No announcements match" : "No announcements yet"}</p>
              <p className="mt-1 text-sm text-ink-muted">
                {filtered ? "Try a different search or filter." : "Create one to share news with your team."}
              </p>
              {filtered && (
                <button
                  onClick={() => { setSearch(""); setStatus("all"); setType("all"); }}
                  className="mt-4 text-sm font-medium text-accent-700 hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-surface-subtle">
              {visible.map((a) => {
                const cat = ANNOUNCEMENT_CATEGORIES.find((c) => c.id === (a.category || "important")) || ANNOUNCEMENT_CATEGORIES[0];
                const Icon = CATEGORY_ICONS[cat.id] || FaBullhorn;
                const scheduled = isScheduled(a);
                return (
                  <li key={a._id} className="group relative flex gap-3 p-4 sm:gap-4 hover:bg-surface-muted/60 transition-colors">
                    {a.imageUrl ? (
                      <img src={a.imageUrl} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover sm:h-16 sm:w-16" />
                    ) : (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg sm:h-16 sm:w-16" style={{ backgroundColor: cat.bg, color: cat.color }}>
                        <Icon aria-hidden="true" />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                        <span className="inline-flex items-center gap-1 font-medium" style={{ color: cat.color }}>
                          <Icon aria-hidden="true" /> {cat.label}
                        </span>
                        <span className="text-ink-faint" aria-hidden="true">·</span>
                        <span className="text-ink-muted">{audienceLabel(a)}</span>
                        {scheduled && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-800">
                            <FaClock aria-hidden="true" /> Scheduled
                          </span>
                        )}
                      </div>
                      {/* Whole-row link; action buttons sit above it */}
                      <Link
                        to={`/admin-dashboard/announcements/${a._id}`}
                        className="mt-1 block font-semibold text-ink after:absolute after:inset-0 after:content-[''] focus-visible:underline outline-none"
                      >
                        <span className="line-clamp-1">{a.title}</span>
                      </Link>
                      <p className="mt-0.5 line-clamp-2 text-sm text-ink-muted max-w-[70ch]">{a.description}</p>
                      <p className={`mt-1.5 text-xs tabular-nums ${scheduled ? "font-medium text-amber-700" : "text-ink-muted"}`}>
                        {scheduled ? `Sends ${fmtDateTime(a.scheduledAt)}` : formatISTDate(new Date(a.publishedAt || a.createdAt))}
                        {a.imageUrl && !scheduled && <FaImage className="ml-2 inline text-ink-faint" aria-label="Has image" />}
                      </p>
                    </div>

                    <div className="relative z-10 flex shrink-0 items-start gap-1">
                      <button
                        onClick={() => navigate(`/admin-dashboard/announcements/edit/${a._id}`)}
                        className="rounded-lg p-2.5 text-ink-muted hover:bg-white hover:text-ink focus-visible:ring-2 focus-visible:ring-accent-500 outline-none"
                        aria-label={`Edit ${a.title}`}
                        title="Edit"
                      >
                        <FaPen aria-hidden="true" />
                      </button>
                      <button
                        onClick={() => handleDelete(a)}
                        disabled={deletingId === a._id}
                        className="rounded-lg p-2.5 text-ink-muted hover:bg-red-50 hover:text-red-700 focus-visible:ring-2 focus-visible:ring-red-500 outline-none disabled:opacity-50"
                        aria-label={`Delete ${a.title}`}
                        title="Delete"
                      >
                        <FaTrash aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnnouncementList;
