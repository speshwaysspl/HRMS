import React from "react";
import { FiAlertTriangle } from "react-icons/fi";

const ErrorState = ({
  title = "Something went wrong",
  message = "Please try again in a moment.",
  onRetry = null,
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-4">
      <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-4">
        <FiAlertTriangle className="text-red-600" size={26} />
      </div>
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      <p className="text-sm text-ink-muted mt-1 max-w-sm">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 px-4 py-2 rounded-lg text-sm font-medium border border-surface-subtle bg-white text-ink hover:bg-surface-muted transition-colors"
        >
          Try again
        </button>
      )}
    </div>
  );
};

export default ErrorState;
