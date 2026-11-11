import React from "react";

// Skeleton loading for the web app. Every page/section that is fetching data
// shows the shape of what's coming instead of a spinner. Spinners are only for
// in-progress actions on a button ("Saving…").

// One shimmering block. Pass sizing/shape with className.
export const Bone = ({ className = "" }) => (
  <div className={`rounded bg-surface-subtle animate-pulse motion-reduce:animate-none ${className}`} aria-hidden="true" />
);

export const Spinner = ({ size = 24, className = "" }) => (
  <div
    className={`animate-spin motion-reduce:animate-none rounded-full border-2 border-surface-subtle border-t-accent-600 ${className}`}
    style={{ width: size, height: size }}
    role="status"
    aria-label="Loading"
  />
);

export const SkeletonRow = ({ columns = 4 }) => (
  <tr>
    {Array.from({ length: columns }).map((_, i) => (
      <td key={i} className="px-4 py-3">
        <Bone className="h-3.5" />
      </td>
    ))}
  </tr>
);

export const SkeletonCard = () => (
  <div className="rounded-xl border border-surface-subtle bg-white p-4 shadow-card">
    <Bone className="h-4 w-1/3 mb-3" />
    <Bone className="h-3 w-2/3 mb-2" />
    <Bone className="h-3 w-1/2" />
  </div>
);

// Varying widths so skeleton rows don't look like a barcode.
const W = ["w-2/3", "w-1/2", "w-3/5", "w-2/5", "w-3/4", "w-1/3"];

const ListSkeleton = ({ rows }) => (
  <div className="rounded-xl border border-surface-subtle bg-white divide-y divide-surface-subtle">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex items-center gap-4 px-4 py-4 sm:px-5">
        <Bone className="h-10 w-10 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <Bone className={`h-3.5 ${W[i % W.length]} max-w-xs`} />
          <Bone className={`h-3 ${W[(i + 2) % W.length]} max-w-[12rem]`} />
        </div>
        <Bone className="hidden sm:block h-8 w-24 rounded-lg" />
      </div>
    ))}
  </div>
);

const TableSkeleton = ({ rows, columns }) => (
  <div className="overflow-hidden rounded-xl border border-surface-subtle bg-white">
    <div className="flex gap-6 border-b border-surface-subtle bg-surface-muted/60 px-5 py-3.5">
      {Array.from({ length: columns }).map((_, c) => <Bone key={c} className="h-3 flex-1 max-w-[7rem]" />)}
    </div>
    <div className="divide-y divide-surface-subtle">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-6 px-5 py-4">
          {Array.from({ length: columns }).map((_, c) => (
            <Bone key={c} className={`h-3.5 flex-1 ${c === 0 ? "max-w-[10rem]" : "max-w-[7rem]"} ${c > 2 ? "hidden md:block" : ""}`} />
          ))}
        </div>
      ))}
    </div>
  </div>
);

const CardsSkeleton = ({ rows }) => (
  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="rounded-xl border border-surface-subtle bg-white p-5 shadow-card">
        <div className="flex items-center gap-3">
          <Bone className="h-10 w-10 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Bone className={`h-3.5 ${W[i % W.length]}`} />
            <Bone className="h-3 w-1/3" />
          </div>
        </div>
        <Bone className="mt-5 h-3 w-full" />
        <Bone className="mt-2 h-3 w-4/5" />
      </div>
    ))}
  </div>
);

const DetailSkeleton = () => (
  <div className="space-y-4">
    <div className="rounded-xl border border-surface-subtle bg-white p-5 shadow-card sm:p-6">
      <div className="flex items-center gap-4">
        <Bone className="h-14 w-14 rounded-full" />
        <div className="flex-1 space-y-2.5">
          <Bone className="h-5 w-1/3 max-w-xs" />
          <Bone className="h-3.5 w-1/4 max-w-[10rem]" />
        </div>
      </div>
    </div>
    <div className="grid gap-4 rounded-xl border border-surface-subtle bg-white p-5 shadow-card sm:grid-cols-2 sm:p-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Bone className="h-3 w-20" />
          <Bone className={`h-4 ${W[i % W.length]}`} />
        </div>
      ))}
    </div>
  </div>
);

const FormSkeleton = ({ rows }) => (
  <div className="rounded-xl border border-surface-subtle bg-white p-5 shadow-card sm:p-6">
    <Bone className="mb-6 h-5 w-48" />
    <div className="grid gap-5 sm:grid-cols-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Bone className="h-3 w-24" />
          <Bone className="h-10 w-full rounded-lg" />
        </div>
      ))}
    </div>
    <Bone className="mt-6 h-11 w-full rounded-lg" />
  </div>
);

const DashboardSkeleton = () => (
  <div className="space-y-5">
    <div className="space-y-2">
      <Bone className="h-7 w-56" />
      <Bone className="h-4 w-72 max-w-full" />
    </div>
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-surface-subtle bg-white p-4 shadow-card">
          <Bone className="h-3 w-20" />
          <Bone className="mt-3 h-7 w-12" />
        </div>
      ))}
    </div>
    <div className="grid gap-4 lg:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-xl border border-surface-subtle bg-white p-5 shadow-card">
          <Bone className="h-4 w-32" />
          {[0, 1, 2, 3].map((r) => <Bone key={r} className={`mt-4 h-3 ${W[(i + r) % W.length]}`} />)}
        </div>
      ))}
    </div>
  </div>
);

const VARIANTS = {
  list: ListSkeleton,
  table: TableSkeleton,
  cards: CardsSkeleton,
  detail: DetailSkeleton,
  form: FormSkeleton,
  dashboard: DashboardSkeleton,
};

/**
 * Skeleton placeholder while data loads.
 * @param {string} message   read to screen readers (visually hidden)
 * @param {"list"|"table"|"cards"|"detail"|"form"|"dashboard"} variant  shape of the content
 * @param {number} rows      rows/items to sketch
 * @param {number} columns   table columns
 */
const LoadingState = ({ message = "Loading…", variant = "list", rows = 5, columns = 5, className = "" }) => {
  const Shape = VARIANTS[variant] || ListSkeleton;
  return (
    <div className={className} role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{message}</span>
      <Shape rows={rows} columns={columns} />
    </div>
  );
};

// Whole-page placeholder: page title + content. Used while a route's code
// downloads (Suspense) and while the login session is being checked.
export const PageSkeleton = ({ variant = "list", message = "Loading page…" }) => (
  <div className="p-4 sm:p-6" role="status" aria-live="polite" aria-busy="true">
    <span className="sr-only">{message}</span>
    <div className="mb-6 space-y-2">
      <Bone className="h-7 w-48" />
      <Bone className="h-4 w-72 max-w-full" />
    </div>
    {React.createElement(VARIANTS[variant] || ListSkeleton, { rows: 6, columns: 5 })}
  </div>
);

export default LoadingState;
