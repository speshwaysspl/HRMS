import React, { useEffect, useRef } from "react";

/**
 * Confirmation dialog on the native <dialog> element: focus moves into it,
 * Escape and the backdrop cancel, and the page behind is inert.
 *
 * <ConfirmDialog open title="Check in now?" confirmLabel="Check in" onConfirm={…} onCancel={…}>
 *   …details…
 * </ConfirmDialog>
 */
const ConfirmDialog = ({
  open,
  title,
  children,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "primary", // "primary" | "danger"
  busy = false,
  icon: Icon,
  onConfirm,
  onCancel,
}) => {
  const ref = useRef(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const confirmCls =
    tone === "danger"
      ? "bg-red-600 hover:bg-red-700 focus-visible:ring-red-500"
      : "bg-accent-600 hover:bg-accent-700 focus-visible:ring-accent-500";
  const iconCls = tone === "danger" ? "bg-red-50 text-red-600" : "bg-accent-50 text-accent-700";

  return (
    <dialog
      ref={ref}
      aria-labelledby="confirm-dialog-title"
      onCancel={(e) => { e.preventDefault(); if (!busy) onCancel?.(); }}
      onClick={(e) => { if (e.target === ref.current && !busy) onCancel?.(); }}
      className="w-[calc(100%-2rem)] max-w-md rounded-2xl border border-surface-subtle bg-white p-0 text-ink shadow-panel backdrop:bg-black/40"
    >
      <div className="p-5 sm:p-6">
        <div className="flex items-start gap-4">
          {Icon && (
            <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${iconCls}`} aria-hidden="true">
              <Icon size={20} />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h2 id="confirm-dialog-title" className="text-lg font-semibold text-ink">{title}</h2>
            {children && <div className="mt-2 text-sm text-ink-muted">{children}</div>}
          </div>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="min-h-[44px] rounded-lg border border-surface-subtle bg-white px-4 text-sm font-medium text-ink hover:bg-surface-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            autoFocus
            onClick={onConfirm}
            disabled={busy}
            className={`min-h-[44px] rounded-lg px-5 text-sm font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-60 ${confirmCls}`}
          >
            {busy ? "Please wait…" : confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
};

export default ConfirmDialog;
