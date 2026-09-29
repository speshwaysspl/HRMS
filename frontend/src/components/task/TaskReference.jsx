import React, { useEffect, useMemo, useRef } from "react";
import { FiPaperclip, FiX, FiExternalLink, FiFileText } from "react-icons/fi";
import { API_BASE } from "../../utils/apiConfig";

// The lead's optional "what to do" attachment on a task (mock-up, screenshot, spec).
// Separate from the employee's work proof.

const IMAGE_RE = /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i;
const absUrl = (u) => (u?.startsWith("http") ? u : `${API_BASE}/${String(u || "").replace(/^\//, "")}`);

/** Picker used by the lead when assigning a task. */
export const ReferencePicker = ({ file, onChange, disabled }) => {
  const inputRef = useRef(null);
  const preview = useMemo(() => (file && file.type.startsWith("image/") ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  return (
    <div>
      <p className="block text-sm font-medium text-ink mb-1.5">
        Reference <span className="font-normal text-ink-muted">(optional)</span>
      </p>
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
        disabled={disabled}
        onChange={(e) => {
          onChange(e.target.files?.[0] || null);
          e.target.value = "";
        }}
      />
      {file ? (
        <div className="flex items-center gap-3 rounded-lg border border-surface-subtle p-2">
          {preview ? (
            <img src={preview} alt="" className="h-14 w-14 shrink-0 rounded-md object-cover" />
          ) : (
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-surface-muted text-ink-muted">
              <FiFileText className="text-xl" aria-hidden="true" />
            </span>
          )}
          <span className="min-w-0 flex-1 truncate text-sm text-ink">{file.name}</span>
          <button
            type="button"
            onClick={() => onChange(null)}
            disabled={disabled}
            aria-label="Remove reference"
            className="rounded-lg p-2 text-ink-muted hover:bg-surface-muted hover:text-ink focus-visible:ring-2 focus-visible:ring-accent-500 outline-none"
          >
            <FiX aria-hidden="true" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-surface-subtle px-3 py-3 text-sm text-ink-muted hover:border-accent-500 hover:text-accent-700 focus-visible:ring-2 focus-visible:ring-accent-500 outline-none transition-colors"
        >
          <FiPaperclip aria-hidden="true" /> Attach an image or file showing what to do
        </button>
      )}
    </div>
  );
};

/** Read-only view for the employee (and the lead). Renders nothing when there's no reference. */
export const ReferenceView = ({ url, name }) => {
  if (!url) return null;
  const href = absUrl(url);
  const isImage = IMAGE_RE.test(url) || IMAGE_RE.test(name || "");
  return (
    <div>
      <p className="text-sm font-medium text-ink mb-1.5">Reference from your team lead</p>
      {isImage ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className="group block overflow-hidden rounded-lg border border-surface-subtle focus-visible:ring-2 focus-visible:ring-accent-500 outline-none">
          <img src={href} alt={name || "Task reference"} className="max-h-64 w-full bg-surface-muted object-contain" loading="lazy" />
          <span className="flex items-center gap-1.5 px-3 py-2 text-xs text-ink-muted group-hover:text-accent-700">
            <FiExternalLink aria-hidden="true" /> Open full size
          </span>
        </a>
      ) : (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex max-w-full items-center gap-2 rounded-lg border border-surface-subtle px-3 py-2 text-sm text-ink hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-accent-500 outline-none"
        >
          <FiFileText className="shrink-0 text-ink-muted" aria-hidden="true" />
          <span className="truncate">{name || "Open attachment"}</span>
          <FiExternalLink className="shrink-0 text-ink-muted" aria-hidden="true" />
        </a>
      )}
    </div>
  );
};
