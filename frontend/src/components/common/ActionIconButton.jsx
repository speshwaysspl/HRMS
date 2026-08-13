import React from "react";

const COLOR_STYLES = {
  neutral: "text-ink-muted hover:bg-surface-muted hover:text-ink",
  brand: "text-ink-muted hover:bg-brand-50 hover:text-brand-700",
  accent: "text-ink-muted hover:bg-accent-50 hover:text-accent-700",
  danger: "text-ink-muted hover:bg-red-50 hover:text-red-600",
};

const ActionIconButton = ({ icon: Icon, label, onClick, color = "neutral", type = "button" }) => (
  <span className="relative inline-flex group">
    <button
      type={type}
      onClick={onClick}
      aria-label={label}
      className={`p-2 rounded-lg transition-colors duration-150 ${COLOR_STYLES[color]}`}
    >
      <Icon size={15} />
    </button>
    <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 whitespace-nowrap rounded-md bg-brand-900 px-2 py-1 text-[11px] font-medium text-white opacity-0 scale-95 transition-all duration-100 group-hover:opacity-100 group-hover:scale-100 z-20">
      {label}
    </span>
  </span>
);

export default ActionIconButton;
