import { FiAward, FiCalendar, FiGift, FiMapPin, FiStar, FiSun, FiVolume2 } from "react-icons/fi";
import { MdFormatQuote, MdOutlineCake } from "react-icons/md";

/**
 * Announcement types (nutri_hrms style). Each has its own palette — set via
 * `data-type` on `.anc` in index.css — icon and layout. "general" is the
 * legacy alias of notice. Flutter mirror: mobile/lib/widgets/announcement_card.dart.
 */
export const ANNOUNCEMENT_TYPES = {
  important: { label: "Important Announcement", short: "Important", icon: FiVolume2 },
  quote: { label: "Today's Quote", short: "Quote", icon: MdFormatQuote },
  festival: { label: "Festival Greeting", short: "Festival", icon: FiGift },
  event: { label: "Event & Activity", short: "Event", icon: FiCalendar },
  achievement: { label: "Achievement", short: "Achievement", icon: FiStar },
  notice: { label: "Company Notice", short: "Notice", icon: FiMapPin },
  birthday: { label: "Birthday", short: "Birthday", icon: MdOutlineCake },
  anniversary: { label: "Work Anniversary", short: "Anniversary", icon: FiAward },
  holiday: { label: "Holiday", short: "Holiday", icon: FiSun },
};

export const announcementType = (category) =>
  category === "general" || !ANNOUNCEMENT_TYPES[category] ? "notice" : category;

export const timeAgo = (v) => {
  const min = Math.round((Date.now() - new Date(v).getTime()) / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} h ago`;
  if (h < 48) return "Yesterday";
  return new Date(v).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};
