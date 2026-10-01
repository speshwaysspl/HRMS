import React from "react";
import { FaStar, FaRegStar } from "react-icons/fa";

// Task rating (1-10) given by the team lead. Read-only unless `onChange` is passed;
// clicking the current value again clears it.
const StarRating = ({ value = 0, onChange, size = 16 }) => {
  const editable = typeof onChange === "function";
  return (
    <div
      className="inline-flex flex-wrap items-center gap-0.5"
      role={editable ? "radiogroup" : "img"}
      aria-label={value ? `Rated ${value} out of 10` : "Not rated"}
    >
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => {
        const Icon = n <= value ? FaStar : FaRegStar;
        const star = <Icon size={size} className={n <= value ? "text-amber-500" : "text-ink-faint"} />;
        return editable ? (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            onClick={() => onChange(value === n ? 0 : n)}
            className="p-1 rounded focus-visible:ring-2 focus-visible:ring-accent-500 outline-none"
          >
            {star}
          </button>
        ) : (
          <span key={n}>{star}</span>
        );
      })}
    </div>
  );
};

export default StarRating;
