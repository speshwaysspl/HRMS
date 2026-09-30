import React, { useEffect, useId, useRef, useState } from "react";
import { FiCheck, FiChevronDown } from "react-icons/fi";

// Styled replacement for a native <select>: the browser's own option list
// can't be styled and renders oversized on desktop/mobile emulation. Menu
// opens anchored under the field, matching the Flutter DropdownButtonFormField.
const SelectMenu = ({ name, value, onChange, options, placeholder = "Select", required, invalid }) => {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const rootRef = useRef(null);
  const listId = useId();
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  const choose = (opt) => {
    onChange({ target: { name, value: opt.value } });
    setOpen(false);
  };

  const openMenu = () => {
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen(true);
  };

  const onKeyDown = (e) => {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        openMenu();
      }
      return;
    }
    if (e.key === "Escape") setOpen(false);
    else if (e.key === "ArrowDown") setActive((i) => Math.min(options.length - 1, i + 1));
    else if (e.key === "ArrowUp") setActive((i) => Math.max(0, i - 1));
    else if ((e.key === "Enter" || e.key === " ") && options[active]) choose(options[active]);
    else if (e.key === "Tab") setOpen(false);
    else return;
    e.preventDefault();
  };

  return (
    <div ref={rootRef} className="relative mt-1">
      <button
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-invalid={invalid || undefined}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onKeyDown}
        className={`flex w-full min-h-[44px] items-center justify-between gap-2 rounded-lg border bg-white px-3 py-2 text-left text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 ${
          open ? "border-accent-500 ring-2 ring-accent-500" : invalid ? "border-red-500" : "border-surface-subtle hover:border-ink-faint"
        }`}
      >
        <span className={selected ? "text-ink" : "text-ink-faint"}>{selected ? selected.label : placeholder}</span>
        <FiChevronDown
          size={18}
          className={`shrink-0 text-ink-muted transition-transform duration-200 motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      {/* Keeps native form validation for required fields. */}
      {required && (
        <input tabIndex={-1} aria-hidden="true" required value={value || ""} onChange={() => {}}
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px opacity-0" />
      )}
      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1.5 max-h-64 w-full overflow-auto rounded-xl border border-surface-subtle bg-white py-1.5 shadow-lg"
        >
          {options.length === 0 && <li className="px-3 py-2.5 text-sm text-ink-muted">No options available</li>}
          {options.map((opt, i) => {
            const isSel = opt.value === value;
            return (
              <li
                key={opt.value}
                role="option"
                aria-selected={isSel}
                onPointerEnter={() => setActive(i)}
                onClick={() => choose(opt)}
                className={`flex min-h-[44px] cursor-pointer items-center justify-between px-3 text-sm ${
                  i === active ? "bg-surface-muted" : ""
                } ${isSel ? "font-semibold text-brand-700" : "text-ink"}`}
              >
                {opt.label}
                {isSel && <FiCheck size={16} className="text-brand-700" aria-hidden="true" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default SelectMenu;
