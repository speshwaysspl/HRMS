import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { FiLink, FiCopy, FiCheck, FiTrash2, FiSearch, FiPower } from "react-icons/fi";
import { API_BASE, getAuthHeaders } from "../../utils/apiConfig";
import { useLiveData } from "../../context/NotificationContext";
import PageHeader from "../common/PageHeader";
import EmptyState from "../common/EmptyState";
import ErrorState from "../common/ErrorState";
import { SkeletonRow } from "../common/LoadingState";

const EXPIRY_OPTIONS = [
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
  { value: 365, label: "1 year" },
  { value: 0, label: "Never" },
];

const inputCls =
  "w-full p-2 border border-surface-subtle rounded-lg text-ink bg-white focus:outline-none focus:ring-2 focus:ring-accent-500 disabled:opacity-60";
const labelCls = "block text-sm font-medium text-ink-muted mb-1";

const statusStyles = {
  active: "bg-green-50 text-green-700",
  expired: "bg-amber-50 text-amber-700",
  disabled: "bg-surface-muted text-ink-muted",
};

const formatDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—");

const ShortLinks = () => {
  const [form, setForm] = useState({ url: "", title: "", alias: "", expiresInDays: 90 });
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");
  const [created, setCreated] = useState(null);

  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState("");
  const [copiedId, setCopiedId] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoadError(false);
      const { data } = await axios.get(`${API_BASE}/api/links`, {
        params: query ? { q: query } : {},
        headers: getAuthHeaders(),
      });
      setLinks(data.links || []);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const t = setTimeout(load, query ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, query]);

  // Live: refresh when another admin/HR creates, edits or deletes a link.
  useLiveData(["links"], load);

  const copy = async (link) => {
    try {
      await navigator.clipboard.writeText(link.shortUrl);
      setCopiedId(link._id);
      setTimeout(() => setCopiedId((id) => (id === link._id ? null : id)), 1800);
    } catch {
      window.prompt("Copy this link:", link.shortUrl);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setFormError("");
    setCreated(null);
    if (!form.url.trim()) return setFormError("Paste the link you want to shorten.");
    setCreating(true);
    try {
      const { data } = await axios.post(
        `${API_BASE}/api/links`,
        {
          url: form.url.trim(),
          title: form.title.trim(),
          alias: form.alias.trim() || undefined,
          expiresInDays: Number(form.expiresInDays),
        },
        { headers: getAuthHeaders() }
      );
      setCreated(data.link);
      setLinks((prev) => [data.link, ...prev.filter((l) => l._id !== data.link._id)]);
      setForm((f) => ({ ...f, url: "", title: "", alias: "" }));
    } catch (err) {
      setFormError(err.response?.data?.error || "Couldn't create the link. Try again.");
    } finally {
      setCreating(false);
    }
  };

  const toggle = async (link) => {
    setBusyId(link._id);
    try {
      const { data } = await axios.patch(
        `${API_BASE}/api/links/${link._id}`,
        { active: !link.active },
        { headers: getAuthHeaders() }
      );
      setLinks((prev) => prev.map((l) => (l._id === link._id ? data.link : l)));
    } catch (err) {
      alert(err.response?.data?.error || "Couldn't update the link.");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (link) => {
    if (!window.confirm(`Delete ${link.shortUrl}? Anyone who opens it will see "link expired".`)) return;
    setBusyId(link._id);
    try {
      await axios.delete(`${API_BASE}/api/links/${link._id}`, { headers: getAuthHeaders() });
      setLinks((prev) => prev.filter((l) => l._id !== link._id));
    } catch (err) {
      alert(err.response?.data?.error || "Couldn't delete the link.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <PageHeader
        icon={FiLink}
        title="Short Links"
        subtitle="Create short, trackable links to Speshway pages for emails, WhatsApp and announcements."
      />

      <form
        onSubmit={submit}
        className="bg-white border border-surface-subtle rounded-xl shadow-card p-4 md:p-6 mb-6 grid grid-cols-1 md:grid-cols-6 gap-4 items-end"
        noValidate
      >
        <div className="md:col-span-6">
          <label htmlFor="sl-url" className={labelCls}>Link to shorten</label>
          <input
            id="sl-url"
            type="url"
            inputMode="url"
            placeholder="https://speshwayhrms.com/…"
            className={inputCls}
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            disabled={creating}
            aria-describedby="sl-url-help"
          />
          <p id="sl-url-help" className="text-xs text-ink-muted mt-1">
            Only links to speshwayhrms.com and speshway.com can be shortened.
          </p>
        </div>
        <div className="md:col-span-2">
          <label htmlFor="sl-title" className={labelCls}>Label (optional)</label>
          <input id="sl-title" className={inputCls} maxLength={120} placeholder="e.g. Diwali holiday notice"
            value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} disabled={creating} />
        </div>
        <div className="md:col-span-2">
          <label htmlFor="sl-alias" className={labelCls}>Custom ending (optional)</label>
          <div className="flex items-center rounded-lg border border-surface-subtle focus-within:ring-2 focus-within:ring-accent-500 bg-white">
            <span className="pl-2 text-sm text-ink-muted whitespace-nowrap">/s/</span>
            <input id="sl-alias" className="w-full p-2 rounded-lg text-ink focus:outline-none" maxLength={32}
              placeholder="random" value={form.alias}
              onChange={(e) => setForm({ ...form, alias: e.target.value.replace(/[^a-zA-Z0-9-]/g, "") })} disabled={creating} />
          </div>
        </div>
        <div className="md:col-span-1">
          <label htmlFor="sl-exp" className={labelCls}>Expires</label>
          <select id="sl-exp" className={inputCls} value={form.expiresInDays}
            onChange={(e) => setForm({ ...form, expiresInDays: e.target.value })} disabled={creating}>
            {EXPIRY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <button
          type="submit"
          disabled={creating}
          className="md:col-span-1 min-h-[44px] flex items-center justify-center gap-1.5 bg-accent-600 hover:bg-accent-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2.5 px-4 rounded-lg transition-colors"
        >
          {creating ? "Creating…" : "Shorten"}
        </button>

        {formError && (
          <p role="alert" className="md:col-span-6 text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">{formError}</p>
        )}
        {created && (
          <div role="status" className="md:col-span-6 flex flex-col sm:flex-row sm:items-center gap-2 bg-green-50 rounded-lg px-3 py-2">
            <span className="text-sm text-green-800">Link ready:</span>
            <a href={created.shortUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-green-900 break-all underline">
              {created.shortUrl}
            </a>
            <button type="button" onClick={() => copy(created)}
              className="sm:ml-auto inline-flex items-center gap-1 text-sm font-medium text-green-900 hover:underline min-h-[44px] sm:min-h-0">
              {copiedId === created._id ? <><FiCheck aria-hidden /> Copied</> : <><FiCopy aria-hidden /> Copy</>}
            </button>
          </div>
        )}
      </form>

      <div className="bg-white border border-surface-subtle rounded-xl shadow-card">
        <div className="p-4 border-b border-surface-subtle">
          <label htmlFor="sl-search" className="sr-only">Search links</label>
          <div className="relative max-w-sm">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" aria-hidden />
            <input id="sl-search" type="search" placeholder="Search by label, link or code"
              className={`${inputCls} pl-9`} value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
        </div>

        {loading ? (
          <div className="p-4 space-y-3">{[0, 1, 2].map((i) => <SkeletonRow key={i} columns={4} />)}</div>
        ) : loadError ? (
          <ErrorState message="Couldn't load your links." onRetry={load} />
        ) : links.length === 0 ? (
          <EmptyState icon={FiLink} title={query ? "No matching links" : "No short links yet"}
            message={query ? "Try a different search." : "Shorten a Speshway link above to share it in emails or WhatsApp."} />
        ) : (
          <ul className="divide-y divide-surface-subtle">
            {links.map((link) => (
              <li key={link._id} className="p-4 flex flex-col lg:flex-row lg:items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <a href={link.shortUrl} target="_blank" rel="noopener noreferrer"
                      className="font-semibold text-ink hover:underline break-all">{link.shortUrl.replace(/^https?:\/\//, "")}</a>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusStyles[link.status]}`}>
                      {link.status === "active" ? "Active" : link.status === "expired" ? "Expired" : "Disabled"}
                    </span>
                  </div>
                  {link.title && <p className="text-sm text-ink mt-0.5">{link.title}</p>}
                  <p className="text-xs text-ink-muted mt-0.5 break-all">→ {link.targetUrl}</p>
                </div>
                <dl className="flex gap-6 text-sm lg:w-64 flex-shrink-0">
                  <div>
                    <dt className="text-xs text-ink-muted">Clicks</dt>
                    <dd className="font-semibold text-ink tabular-nums">{link.clicks.toLocaleString()}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-ink-muted">Expires</dt>
                    <dd className="text-ink">{link.expiresAt ? formatDate(link.expiresAt) : "Never"}</dd>
                  </div>
                  <div className="hidden sm:block">
                    <dt className="text-xs text-ink-muted">By</dt>
                    <dd className="text-ink truncate max-w-[6rem]">{link.createdBy?.name || "—"}</dd>
                  </div>
                </dl>
                <div className="flex gap-1 flex-shrink-0">
                  <button type="button" onClick={() => copy(link)} aria-label={`Copy ${link.shortUrl}`}
                    className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-lg text-ink-muted hover:text-ink hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-600">
                    {copiedId === link._id ? <FiCheck className="text-green-600" /> : <FiCopy />}
                  </button>
                  <button type="button" onClick={() => toggle(link)} disabled={busyId === link._id}
                    aria-label={link.active ? `Disable ${link.shortUrl}` : `Enable ${link.shortUrl}`} title={link.active ? "Disable" : "Enable"}
                    className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-lg text-ink-muted hover:text-ink hover:bg-surface-muted disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-600">
                    <FiPower className={link.active ? "" : "text-amber-600"} />
                  </button>
                  <button type="button" onClick={() => remove(link)} disabled={busyId === link._id} aria-label={`Delete ${link.shortUrl}`}
                    className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-lg text-ink-muted hover:text-red-700 hover:bg-red-50 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600">
                    <FiTrash2 />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ShortLinks;
