import { useEffect, useState } from "react";

// Sidebar open/closed that survives a refresh. Desktop restores the last
// choice; phones always start closed so the overlay never covers the page.
const KEY = "sidebarOpen";
const isDesktop = () => typeof window === "undefined" || window.innerWidth >= 768;

const readSaved = () => {
  try {
    const v = localStorage.getItem(KEY);
    return v === null ? null : v === "1";
  } catch {
    return null;
  }
};

export const useSidebarState = () => {
  const [open, setOpen] = useState(() => (isDesktop() ? readSaved() ?? true : false));

  // Remember the desktop choice only (closing the phone overlay after a tap
  // shouldn't collapse the desktop sidebar next time).
  useEffect(() => {
    if (!isDesktop()) return;
    try { localStorage.setItem(KEY, open ? "1" : "0"); } catch { /* storage unavailable */ }
  }, [open]);

  return [open, setOpen];
};
