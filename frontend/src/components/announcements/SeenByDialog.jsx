import React, { useEffect, useState } from "react";
import LoadingState from "../common/LoadingState";
import axios from "axios";
import { FiX } from "react-icons/fi";
import { API_BASE } from "../../utils/apiConfig";

/** "Who has seen it" — Seen / Not seen yet lists for one announcement (admin / HR). */
const SeenByDialog = ({ announcement, onClose }) => {
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!announcement) return undefined;
    setData(null);
    axios
      .get(`${API_BASE}/api/announcement/${announcement._id}/seen`, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
      })
      .then((res) => setData(res.data))
      .catch(() => setData({ error: true, seen: [], notSeen: [] }));
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [announcement, onClose]);

  if (!announcement) return null;

  const List = ({ title, people, tone }) => (
    <section>
      <h3 className="text-sm font-semibold text-ink">
        {title} <span className={`ml-1 rounded-full px-2 py-0.5 text-xs tabular-nums ${tone}`}>{people.length}</span>
      </h3>
      {people.length ? (
        <ul className="mt-2 max-h-64 divide-y divide-surface-subtle overflow-y-auto rounded-lg border border-surface-subtle">
          {people.map((p) => (
            <li key={p._id} className="px-3 py-2">
              <p className="text-sm font-medium text-ink">{p.name}</p>
              <p className="text-xs text-ink-muted">{p.email}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-ink-muted">No one.</p>
      )}
    </section>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="seen-title"
        className="w-full max-w-lg rounded-2xl bg-white shadow-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-surface-subtle px-5 py-4">
          <div className="min-w-0">
            <h2 id="seen-title" className="text-lg font-semibold text-ink">Who has seen it</h2>
            <p className="truncate text-sm text-ink-muted">{announcement.title}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-10 w-10 place-items-center rounded-lg text-ink-muted hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500">
            <FiX size={18} />
          </button>
        </div>
        <div className="grid gap-5 p-5 sm:grid-cols-2">
          {!data ? (
            <LoadingState message="Loading who has seen this…" rows={4} className="sm:col-span-2" />
          ) : data.error ? (
            <p role="alert" className="text-sm text-red-600 sm:col-span-2">Couldn't load who has seen it. Please try again.</p>
          ) : (
            <>
              <List title="Seen" people={data.seen} tone="bg-accent-50 text-accent-700" />
              <List title="Not seen yet" people={data.notSeen} tone="bg-surface-muted text-ink-muted" />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SeenByDialog;
