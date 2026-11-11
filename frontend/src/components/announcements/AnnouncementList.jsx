// src/components/announcement/AnnouncementList.jsx
import React, { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { FaBullhorn, FaThumbtack } from "react-icons/fa";
import { FiClock, FiEdit2, FiEye, FiImage, FiPlus, FiSearch, FiTrash2, FiX } from "react-icons/fi";
import SeenByDialog from "./SeenByDialog";
import { fetchAnnouncements } from "../../utils/AnnouncementHelper";
import { API_BASE } from "../../utils/apiConfig";
import { formatISTDate } from "../../utils/dateTimeUtils";
import useMeta from "../../utils/useMeta";
import { ANNOUNCEMENT_CATEGORIES, CATEGORY_ICONS } from "./AnnouncementAdd";
import { useLiveTick } from "../../context/NotificationContext";
import { Bone } from "../common/LoadingState";

const AUDIENCE = {
  all: "All employees",
  team_leads: "Team leads",
  team_members: "Team members",
  specific: "Specific people",
};
const audienceLabel = (a) => (a.scope === "team" ? `Team: ${a.targetTeam?.name || "Team"}` : AUDIENCE[a.scope] || "All employees");
const isScheduled = (a) => a.published === false;
const fmtDateTime = (d) => new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

const categoryOf = (a) => {
  const catId = a.category === "general" ? "notice" : a.category || "important";
  const cat = ANNOUNCEMENT_CATEGORIES.find((c) => c.id === catId) || ANNOUNCEMENT_CATEGORIES[0];
  return { cat, Icon: CATEGORY_ICONS[cat.id] || FaBullhorn };
};

const field =
  "h-10 rounded-lg border border-surface-subtle bg-white px-3 text-sm text-ink placeholder:text-ink-faint " +
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:border-transparent";
const iconBtn =
  "grid h-10 w-10 place-items-center rounded-lg transition-colors duration-150 " +
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 disabled:opacity-50";

const StatusPill = ({ a }) => {
  if (isScheduled(a)) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
        <FiClock aria-hidden="true" /> Scheduled
      </span>
    );
  }
  if (a.status === "ended") {
    return <span className="inline-flex rounded-full bg-surface-muted px-2.5 py-1 text-xs font-semibold text-ink-muted">Ended</span>;
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-800">
      <span className="h-1.5 w-1.5 rounded-full bg-green-600" aria-hidden="true" /> Live
    </span>
  );
};

const Thumb = ({ a, size = "h-12 w-12" }) => {
  const { cat, Icon } = categoryOf(a);
  return a.imageUrl ? (
    <img src={a.imageUrl} alt="" className={`${size} shrink-0 rounded-lg object-cover`} />
  ) : (
    <span className={`${size} grid shrink-0 place-items-center rounded-lg`} style={{ backgroundColor: cat.bg, color: cat.color }}>
      <Icon aria-hidden="true" />
    </span>
  );
};

const AnnouncementList = () => {
  const liveTick = useLiveTick(["announcement"]);
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all"); // all | published | scheduled
  const [type, setType] = useState("all");
  const [deletingId, setDeletingId] = useState(null);
  const [deletingAll, setDeletingAll] = useState(false);
  const [seenFor, setSeenFor] = useState(null);

  // One-click pin / unpin (pinned stay first in every feed).
  const togglePin = async (a) => {
    try {
      const res = await axios.patch(
        `${API_BASE}/api/announcement/${a._id}/pin`,
        { pinned: !a.pinned },
        { headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` } }
      );
      setItems((list) => list.map((x) => (x._id === a._id ? { ...x, pinned: res.data.pinned } : x)));
    } catch {
      alert("Couldn't update the pin. Please try again.");
    }
  };

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
  }, [liveTick]);

  const scheduledCount = items.filter(isScheduled).length;
  const publishedCount = items.length - scheduledCount;
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
  const clearFilters = () => { setSearch(""); setStatus("all"); setType("all"); };

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
    { id: "published", label: "Published", count: publishedCount },
    { id: "scheduled", label: "Scheduled", count: scheduledCount },
  ];

  const dateLine = (a) =>
    isScheduled(a) ? `Sends ${fmtDateTime(a.scheduledAt)}` : formatISTDate(new Date(a.publishedAt || a.createdAt));

  const SeenButton = ({ a }) => {
    const seen = a.seenCount ?? 0;
    const total = a.recipientCount ?? 0;
    const pct = total ? Math.round((seen / total) * 100) : 0;
    return (
      <button
        onClick={(e) => { e.stopPropagation(); setSeenFor(a); }}
        className="inline-flex items-baseline gap-1.5 rounded-lg px-2 py-1.5 text-sm text-ink hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
        aria-label={`Seen by ${seen} of ${total}. Show who has seen it`}
        title="Who has seen it"
      >
        <FiEye className="self-center text-ink-faint" aria-hidden="true" />
        <span className="font-semibold tabular-nums">{seen}</span>
        <span className="text-ink-muted tabular-nums">of {total}</span>
        <span className="text-xs text-ink-faint tabular-nums">· {pct}%</span>
      </button>
    );
  };

  const Actions = ({ a }) => (
    <div className="flex items-center justify-end gap-0.5">
      <button
        onClick={(e) => { e.stopPropagation(); togglePin(a); }}
        aria-pressed={!!a.pinned}
        className={`${iconBtn} ${a.pinned ? "text-brand-700 hover:bg-brand-50" : "text-ink-faint hover:bg-brand-50 hover:text-brand-700"}`}
        aria-label={a.pinned ? `Unpin ${a.title}` : `Pin ${a.title} to top`}
        title={a.pinned ? "Unpin" : "Pin to top"}
      >
        <FaThumbtack aria-hidden="true" />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); navigate(`/admin-dashboard/announcements/edit/${a._id}`); }}
        className={`${iconBtn} text-ink-faint hover:bg-accent-50 hover:text-accent-700`}
        aria-label={`Edit ${a.title}`}
        title="Edit"
      >
        <FiEdit2 aria-hidden="true" />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); handleDelete(a); }}
        disabled={deletingId === a._id}
        className={`${iconBtn} text-ink-faint hover:bg-red-50 hover:text-red-600 focus-visible:ring-red-500`}
        aria-label={`Delete ${a.title}`}
        title="Delete"
      >
        <FiTrash2 aria-hidden="true" />
      </button>
    </div>
  );

  const openItem = (a) => navigate(`/admin-dashboard/announcements/${a._id}`);

  return (
    <div className="min-h-screen bg-surface-muted py-1 sm:p-6">
      {/* Header */}
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4 px-3 sm:px-0">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Announcements</h1>
          {!loading && (
            <p className="mt-1 text-sm text-ink-muted">
              <span className="font-semibold text-ink tabular-nums">{publishedCount}</span> published
              {scheduledCount > 0 && <span className="text-amber-800"> · {scheduledCount} scheduled to go out</span>}
            </p>
          )}
        </div>
        <Link
          to="/admin-dashboard/announcements/add"
          className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-accent-600 px-4 text-sm font-semibold text-white transition-colors duration-150 hover:bg-accent-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
        >
          <FiPlus aria-hidden="true" /> New announcement
        </Link>
      </header>

      {/* Tabs + filters */}
      <div className="mb-4 flex flex-col gap-3 px-3 sm:px-0 lg:flex-row lg:items-center lg:justify-between">
        <div role="tablist" aria-label="Status" className="flex gap-1 self-start overflow-x-auto rounded-xl border border-surface-subtle bg-white p-1">
          {statusTabs.map((t) => {
            const active = status === t.id;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={active}
                onClick={() => setStatus(t.id)}
                className={`flex h-9 shrink-0 items-center gap-2 rounded-lg px-3.5 text-sm font-medium transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 ${
                  active ? "bg-brand-700 text-white" : "text-ink-muted hover:bg-surface-muted hover:text-ink"
                }`}
              >
                {t.label}
                <span className={`rounded-full px-1.5 text-xs tabular-nums ${active ? "bg-white/20 text-white" : t.id === "scheduled" && t.count > 0 ? "bg-amber-100 text-amber-800" : "bg-surface-muted text-ink-muted"}`}>
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1 lg:w-72 lg:flex-none">
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
            <input
              type="search"
              aria-label="Search announcements"
              placeholder="Search title or message"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`${field} w-full pl-9`}
            />
          </div>
          <label htmlFor="ann-type" className="sr-only">Type</label>
          <select id="ann-type" value={type} onChange={(e) => setType(e.target.value)} className={field}>
            <option value="all">All types</option>
            {ANNOUNCEMENT_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
          {filtered && (
            <button onClick={clearFilters} className="inline-flex h-10 items-center gap-1 rounded-lg px-2.5 text-sm font-medium text-accent-700 hover:bg-accent-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500">
              <FiX aria-hidden="true" /> Clear
            </button>
          )}
          {!loading && visible.length > 0 && (
            <button
              onClick={handleDeleteAll}
              disabled={deletingAll}
              className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-red-700 transition-colors duration-150 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-50"
            >
              <FiTrash2 aria-hidden="true" />
              {deletingAll ? "Deleting…" : `Delete ${filtered ? "these" : "all"} (${visible.length})`}
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div role="status" aria-busy="true" className="overflow-hidden rounded-xl border border-surface-subtle bg-white shadow-card">
          <span className="sr-only">Loading announcements…</span>
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-4 border-b border-surface-subtle px-5 py-4 last:border-0">
              <Bone className="h-12 w-12 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Bone className="h-4 w-1/3 max-w-xs" />
                <Bone className="h-3 w-1/2 max-w-md" />
              </div>
              <Bone className="hidden h-6 w-16 rounded-full md:block" />
              <Bone className="hidden h-4 w-24 md:block" />
            </div>
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="mx-3 rounded-xl border border-surface-subtle bg-white px-6 py-16 text-center shadow-card sm:mx-0">
          <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-brand-50 text-brand-600">
            <FaBullhorn size={22} aria-hidden="true" />
          </span>
          <h2 className="font-semibold text-ink">{filtered ? "No announcements match" : "No announcements yet"}</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-muted">
            {filtered ? "Try a different search or filter." : "Share news, quotes and notices with everyone, a team, or specific people."}
          </p>
          {filtered ? (
            <button onClick={clearFilters} className="mt-4 text-sm font-medium text-accent-700 underline underline-offset-2">Show all announcements</button>
          ) : (
            <Link to="/admin-dashboard/announcements/add" className="mt-5 inline-flex h-10 items-center gap-1.5 rounded-lg bg-accent-600 px-4 text-sm font-semibold text-white hover:bg-accent-700">
              <FiPlus aria-hidden="true" /> New announcement
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto rounded-xl border border-surface-subtle bg-white shadow-card md:block">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-surface-subtle text-left text-xs font-medium text-ink-muted">
                  <th scope="col" className="px-5 py-3 font-medium">Announcement</th>
                  <th scope="col" className="px-4 py-3 font-medium">Type</th>
                  <th scope="col" className="hidden px-4 py-3 font-medium lg:table-cell">Audience</th>
                  <th scope="col" className="px-4 py-3 font-medium">Status</th>
                  <th scope="col" className="px-4 py-3 font-medium">Date</th>
                  <th scope="col" className="px-4 py-3 font-medium">Seen</th>
                  <th scope="col" className="px-3 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-subtle">
                {visible.map((a) => {
                  const { cat, Icon } = categoryOf(a);
                  const scheduled = isScheduled(a);
                  return (
                    <tr key={a._id} onClick={() => openItem(a)} className="cursor-pointer transition-colors duration-150 hover:bg-surface-muted/70">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3.5">
                          <Thumb a={a} />
                          <div className="min-w-0 max-w-xl">
                            <div className="flex items-center gap-2">
                              <Link
                                to={`/admin-dashboard/announcements/${a._id}`}
                                onClick={(e) => e.stopPropagation()}
                                className="line-clamp-1 font-semibold text-ink underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 rounded"
                              >
                                {a.title}
                              </Link>
                              {a.pinned && <FaThumbtack className="shrink-0 text-xs text-brand-600" aria-label="Pinned" />}
                              {a.imageUrl && <FiImage className="shrink-0 text-ink-faint" aria-label="Has image" />}
                            </div>
                            <p className="mt-0.5 line-clamp-1 text-sm text-ink-muted">{a.description}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-medium" style={{ color: cat.color }}>
                          <Icon aria-hidden="true" /> {cat.label}
                        </span>
                      </td>
                      <td className="hidden px-4 py-3.5 text-sm text-ink lg:table-cell">{audienceLabel(a)}</td>
                      <td className="px-4 py-3.5"><StatusPill a={a} /></td>
                      <td className={`whitespace-nowrap px-4 py-3.5 text-sm tabular-nums ${scheduled ? "font-medium text-amber-800" : "text-ink-muted"}`}>
                        {dateLine(a)}
                        {a.expiresAt && (
                          <span className="block text-xs text-ink-faint">
                            until {new Date(a.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">{scheduled ? <span className="text-sm text-ink-faint">Not sent yet</span> : <SeenButton a={a} />}</td>
                      <td className="px-3 py-3.5"><Actions a={a} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Phone cards */}
          <ul className="space-y-2.5 px-3 md:hidden">
            {visible.map((a) => {
              const { cat, Icon } = categoryOf(a);
              const scheduled = isScheduled(a);
              return (
                <li key={a._id}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => openItem(a)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openItem(a); } }}
                    className="rounded-2xl border border-surface-subtle bg-white p-3.5 active:bg-surface-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
                    aria-label={a.title}
                  >
                    <div className="flex gap-3">
                      <Thumb a={a} size="h-14 w-14" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                          <span className="inline-flex items-center gap-1 font-medium" style={{ color: cat.color }}>
                            <Icon aria-hidden="true" /> {cat.label}
                          </span>
                          <StatusPill a={a} />
                          {a.pinned && <FaThumbtack className="text-brand-600" aria-label="Pinned" />}
                        </div>
                        <h3 className="mt-1 line-clamp-1 font-semibold text-ink">{a.title}</h3>
                        <p className="mt-0.5 line-clamp-2 text-sm text-ink-muted">{a.description}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-surface-subtle pt-2">
                      <span className={`text-xs tabular-nums ${scheduled ? "font-medium text-amber-800" : "text-ink-muted"}`}>
                        {dateLine(a)} · {audienceLabel(a)}
                      </span>
                      {!scheduled && <SeenButton a={a} />}
                    </div>
                    <div className="mt-1 flex justify-end border-t border-surface-subtle pt-1">
                      <Actions a={a} />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
      <SeenByDialog announcement={seenFor} onClose={() => setSeenFor(null)} />
    </div>
  );
};

export default AnnouncementList;
