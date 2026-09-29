import React, { useEffect, useMemo, useRef } from "react";
import { FiFile, FiFileText, FiImage, FiExternalLink, FiRefreshCw, FiTrash2, FiUpload, FiRotateCcw } from "react-icons/fi";
import { API_BASE } from "../../utils/apiConfig";

const IMAGE_RE = /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i;
const PDF_RE = /\.pdf(\?|$)/i;

const absUrl = (u) => (u?.startsWith("http") ? u : `${API_BASE}/${String(u || "").replace(/^\//, "")}`);
const fileNameFromUrl = (u) => {
  try {
    return decodeURIComponent(String(u).split("?")[0].split("/").pop()).replace(/^\d{10,}[-_]/, "");
  } catch {
    return "Attached file";
  }
};
const sizeLabel = (n) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/**
 * Work-proof attachment: shows the saved file (thumbnail/preview, open, replace, delete)
 * or a newly picked file (local preview, change, discard). Changes apply on save.
 */
const WorkProofField = ({ existingUrl, existingName, file, onFileChange, removed, onRemovedChange, editable, disabled }) => {
  const inputRef = useRef(null);
  const localUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => localUrl && URL.revokeObjectURL(localUrl), [localUrl]);

  const pick = () => inputRef.current?.click();
  const input = (
    <input
      ref={inputRef}
      type="file"
      className="sr-only"
      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
      disabled={disabled}
      onChange={(e) => {
        const f = e.target.files?.[0];
        if (f) {
          onFileChange(f);
          onRemovedChange(false);
        }
        e.target.value = "";
      }}
    />
  );

  // What to show: a new local file, the saved file, or nothing.
  const showing = file
    ? { url: localUrl, name: file.name, meta: `${sizeLabel(file.size)} · not saved yet`, isImage: file.type.startsWith("image/"), isPdf: file.type === "application/pdf", isNew: true }
    : existingUrl && !removed
      ? { url: absUrl(existingUrl), name: existingName || fileNameFromUrl(existingUrl), meta: "Saved", isImage: IMAGE_RE.test(existingUrl), isPdf: PDF_RE.test(existingUrl), isNew: false }
      : null;

  const btn =
    "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent-500 disabled:opacity-50";

  if (!showing) {
    if (removed && existingUrl) {
      return (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          <span>The attached file will be deleted when you save.</span>
          <span className="flex gap-1">
            <button type="button" onClick={() => onRemovedChange(false)} disabled={disabled} className={`${btn} text-red-800 hover:bg-red-100`}>
              <FiRotateCcw aria-hidden="true" /> Undo
            </button>
            {editable && (
              <button type="button" onClick={pick} disabled={disabled} className={`${btn} text-ink hover:bg-white`}>
                <FiUpload aria-hidden="true" /> Attach another
              </button>
            )}
          </span>
          {input}
        </div>
      );
    }
    if (!editable) return <p className="text-sm text-ink-muted">No file attached.</p>;
    return (
      <button
        type="button"
        onClick={pick}
        disabled={disabled}
        className="flex w-full min-h-[80px] flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 px-4 py-4 text-sm text-ink-muted hover:border-accent-500 hover:text-ink focus-visible:ring-2 focus-visible:ring-accent-500 outline-none"
      >
        <FiUpload className="text-lg" aria-hidden="true" />
        <span className="font-medium text-ink">Attach work proof</span>
        <span className="text-xs">Image, PDF or document, up to 10 MB</span>
        {input}
      </button>
    );
  }

  const Icon = showing.isImage ? FiImage : showing.isPdf ? FiFileText : FiFile;
  return (
    <div className={`rounded-lg border ${showing.isNew ? "border-accent-300 bg-accent-50/40" : "border-surface-subtle"} p-3`}>
      <div className="flex items-center gap-3">
        {showing.isImage ? (
          <a href={showing.url} target="_blank" rel="noopener noreferrer" className="shrink-0">
            <img src={showing.url} alt={`Preview of ${showing.name}`} className="h-16 w-16 rounded-md object-cover border border-surface-subtle" />
          </a>
        ) : (
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md bg-surface-muted text-2xl text-ink-muted">
            <Icon aria-hidden="true" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink" title={showing.name}>{showing.name}</p>
          <p className={`text-xs ${showing.isNew ? "text-accent-800" : "text-ink-muted"}`}>{showing.meta}</p>
        </div>
      </div>

      {showing.isPdf && (
        <iframe title={`Preview of ${showing.name}`} src={showing.url} className="mt-3 h-64 w-full rounded-md border border-surface-subtle bg-white" />
      )}

      <div className="mt-3 flex flex-wrap gap-1">
        <a href={showing.url} target="_blank" rel="noopener noreferrer" className={`${btn} text-ink hover:bg-surface-muted`}>
          <FiExternalLink aria-hidden="true" /> Open
        </a>
        {editable && (
          <button type="button" onClick={pick} disabled={disabled} className={`${btn} text-ink hover:bg-surface-muted`}>
            <FiRefreshCw aria-hidden="true" /> {showing.isNew ? "Choose different file" : "Replace"}
          </button>
        )}
        {editable && (
          <button
            type="button"
            onClick={() => (showing.isNew ? onFileChange(null) : onRemovedChange(true))}
            disabled={disabled}
            className={`${btn} text-red-700 hover:bg-red-50`}
          >
            <FiTrash2 aria-hidden="true" /> {showing.isNew ? "Discard" : "Delete"}
          </button>
        )}
      </div>
      {input}
    </div>
  );
};

export default WorkProofField;
