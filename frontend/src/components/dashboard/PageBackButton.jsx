import { useLocation, useNavigate } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";

/**
 * Back button rendered under the Navbar by every dashboard layout. Hidden on
 * the dashboard home itself (e.g. /admin-dashboard); on sub-pages it goes
 * back in history, falling back to the dashboard home on a fresh tab.
 */
const PageBackButton = ({ desktopOnly = false }) => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length <= 1) return null;

  const home = `/${segments[0]}`;
  const goBack = () => (window.history.length > 1 ? navigate(-1) : navigate(home));

  return (
    <button
      type="button"
      onClick={goBack}
      aria-label="Go back"
      className={`${desktopOnly ? "hidden md:inline-flex" : "inline-flex"} items-center gap-1.5 min-h-[40px] px-3 mb-3 rounded-lg border border-surface-subtle bg-white text-ink text-sm font-medium hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 transition-colors`}
    >
      <FiArrowLeft size={16} />
      Back
    </button>
  );
};

export default PageBackButton;
