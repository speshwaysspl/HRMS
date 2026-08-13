import React from "react";
import { FiInbox } from "react-icons/fi";

const EmptyState = ({
  icon: Icon = FiInbox,
  title = "Nothing here yet",
  message = "",
  action = null,
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-4">
      <div className="w-14 h-14 rounded-full bg-surface-muted flex items-center justify-center mb-4">
        <Icon className="text-ink-faint" size={26} />
      </div>
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      {message && <p className="text-sm text-ink-muted mt-1 max-w-sm">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};

export default EmptyState;
