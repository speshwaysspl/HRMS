import React, { useEffect, useMemo, useRef, useState } from "react";
import { FiFile, FiFileText, FiImage, FiExternalLink, FiTrash2, FiUpload, FiRotateCcw } from "react-icons/fi";
import { API_BASE } from "../../utils/apiConfig";

const IMAGE_RE = /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i;
const PDF_RE = /\.pdf(\?|$)/i;
export const MAX_PROOFS = 10;
const MAX_BYTES = 10 * 1024 * 1024;

const absUrl = (u) => (u?.startsWith("http") ? u : `${API_BASE}/${String(u || "").replace(/^\//, "")}`);
const fileNameFromUrl = (u) => {
  try {
    return decodeURIComponent(String(u).split("?")[0].split("/").pop()).replace(/^\d{10,}[-_]/, "");
  } catch {
    return "Attached file";
  }
};
const sizeLabel = (n) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/** Saved proofs of a task as [{url, name}] — falls back to the legacy single workProof. */
export const proofsOf = (task) =>
  task?.workProofs?.length
    ? task.workProofs
    : task?.workProof
      ? [{ url: task.workProof, name: task.workProofName }]
      : [];

const btn =
  "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent-500 disabled:opacity-50";

const ProofRow = ({ url, name, meta, isImage, isPdf, tone, actions }) => {
  const Icon = isImage ? FiImage : isPdf ? FiFileText : FiFile;
  const border =
    tone === "new" ? "border-accent-300 bg-accent-50/40" : tone === "removed" ? "border-dashed border-red-300 bg-red-50" : "border-surface-subtle";
  return (
    <li className={`flex flex-wrap items-center gap-3 rounded-lg border ${border} p-3`}>
      {isImage && tone !== "removed" ? (
        <a href={url} target="_blank" rel="noopener noreferrer" className="shrink-0">
          <img src={url} alt={`Preview of ${name}`} className="h-14 w-14 rounded-md object-cover border border-surface-subtle" />
        </a>
      ) : (
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-surface-muted text-xl text-ink-muted">
          <Icon aria-hidden="true" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm font-medium ${tone === "removed" ? "text-red-800 line-through" : "text-ink"}`} title={name}>{name}</p>
        <p className={`text-xs ${tone === "new" ? "text-accent-800" : tone === "removed" ? "text-red-800" : "text-ink-muted"}`}>{meta}</p>
      </div>
      <div className="flex flex-wrap gap-1">{actions}</div>
    </li>
  );
};

/**
 * Work-proof attachments (multi): lists saved files (open / delete with undo) and newly
 * picked files (local preview / discard), plus an "Add files" picker. Changes apply on save.
 */
const WorkProofField = ({ existing = [], files = [], onFilesChange, removed = [], onRemovedChange, editable, disabled }) => {
  const inputRef = useRef(null);
  const [error, setError] = useState("");
  const localUrls = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => localUrls.forEach((u) => URL.revokeObjectURL(u)), [localUrls]);

  const keptCount = existing.filter((p) => !removed.includes(p.url)).length;
  const room = MAX_PROOFS - keptCount - files.length;

  const onPick = (e) => {
    const picked = Array.from(e.target.files || []);
    e.target.value = "";
    const tooBig = picked.filter((f) => f.size > MAX_BYTES);
    let ok = picked.filter((f) => f.size <= MAX_BYTES);
    let msg = tooBig.length ? `${tooBig.map((f) => f.name).join(", ")} ${tooBig.length > 1 ? "are" : "is"} over 10 MB.` : "";
    if (ok.length > room) {
      msg = `${msg} Only ${MAX_PROOFS} files allowed; ${ok.length - room} not added.`.trim();
      ok = ok.slice(0, Math.max(0, room));
    }
    setError(msg);
    if (ok.length) onFilesChange([...files, ...ok]);
  };

  if (!editable && existing.length === 0) return <p className="text-sm text-ink-muted">No file attached.</p>;

  return (
    <div className="space-y-2">
      {(existing.length > 0 || files.length > 0) && (
        <ul className="space-y-2">
          {existing.map((p) => {
            const isRemoved = removed.includes(p.url);
            const url = absUrl(p.url);
            return (
              <ProofRow
                key={p.url}
                url={url}
                name={p.name || fileNameFromUrl(p.url)}
                meta={isRemoved ? "Will be deleted when you save" : "Saved"}
                isImage={IMAGE_RE.test(p.url)}
                isPdf={PDF_RE.test(p.url)}
                tone={isRemoved ? "removed" : "saved"}
                actions={
                  <>
                    {!isRemoved && (
                      <a href={url} target="_blank" rel="noopener noreferrer" className={`${btn} text-ink hover:bg-surface-muted`}>
                        <FiExternalLink aria-hidden="true" /> Open
                      </a>
                    )}
                    {editable &&
                      (isRemoved ? (
                        <button type="button" disabled={disabled || room <= 0} onClick={() => onRemovedChange(removed.filter((u) => u !== p.url))} className={`${btn} text-red-800 hover:bg-red-100`}>
                          <FiRotateCcw aria-hidden="true" /> Undo
                        </button>
                      ) : (
                        <button type="button" disabled={disabled} onClick={() => onRemovedChange([...removed, p.url])} className={`${btn} text-red-700 hover:bg-red-50`}>
                          <FiTrash2 aria-hidden="true" /> Delete
                        </button>
                      ))}
                  </>
                }
              />
            );
          })}
          {files.map((f, i) => (
            <ProofRow
              key={`${f.name}-${f.size}-${i}`}
              url={localUrls[i]}
              name={f.name}
              meta={`${sizeLabel(f.size)} · not saved yet`}
              isImage={f.type.startsWith("image/")}
              isPdf={f.type === "application/pdf"}
              tone="new"
              actions={
                <>
                  <a href={localUrls[i]} target="_blank" rel="noopener noreferrer" className={`${btn} text-ink hover:bg-surface-muted`}>
                    <FiExternalLink aria-hidden="true" /> Open
                  </a>
                  <button type="button" disabled={disabled} onClick={() => onFilesChange(files.filter((_, j) => j !== i))} className={`${btn} text-red-700 hover:bg-red-50`}>
                    <FiTrash2 aria-hidden="true" /> Discard
                  </button>
                </>
              }
            />
          ))}
        </ul>
      )}

      {editable && room > 0 && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          className="flex w-full min-h-[72px] flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 px-4 py-3 text-sm text-ink-muted hover:border-accent-500 hover:text-ink focus-visible:ring-2 focus-visible:ring-accent-500 outline-none disabled:opacity-50"
        >
          <FiUpload className="text-lg" aria-hidden="true" />
          <span className="font-medium text-ink">{keptCount + files.length ? "Add more files" : "Attach work proof"}</span>
          <span className="text-xs">Images, PDFs or documents · up to {MAX_PROOFS} files, 10 MB each</span>
        </button>
      )}
      {editable && room <= 0 && <p className="text-xs text-ink-muted">You've reached the {MAX_PROOFS}-file limit.</p>}
      {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        multiple
        className="sr-only"
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
        disabled={disabled}
        onChange={onPick}
      />
    </div>
  );
};

export default WorkProofField;
