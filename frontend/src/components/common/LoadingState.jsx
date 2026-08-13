import React from "react";

export const Spinner = ({ size = 24, className = "" }) => (
  <div
    className={`animate-spin rounded-full border-2 border-surface-subtle border-t-accent-600 ${className}`}
    style={{ width: size, height: size }}
    role="status"
    aria-label="Loading"
  />
);

export const SkeletonRow = ({ columns = 4 }) => (
  <tr>
    {Array.from({ length: columns }).map((_, i) => (
      <td key={i} className="px-4 py-3">
        <div className="h-3.5 rounded bg-surface-subtle animate-pulse" />
      </td>
    ))}
  </tr>
);

export const SkeletonCard = () => (
  <div className="rounded-xl border border-surface-subtle bg-white p-4 shadow-card">
    <div className="h-4 w-1/3 rounded bg-surface-subtle animate-pulse mb-3" />
    <div className="h-3 w-2/3 rounded bg-surface-subtle animate-pulse mb-2" />
    <div className="h-3 w-1/2 rounded bg-surface-subtle animate-pulse" />
  </div>
);

const LoadingState = ({ message = "Loading…" }) => (
  <div className="flex flex-col items-center justify-center py-12 gap-3">
    <Spinner size={28} />
    <p className="text-sm text-ink-muted">{message}</p>
  </div>
);

export default LoadingState;
