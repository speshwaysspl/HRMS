import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FiBookmark, FiX } from "react-icons/fi";
import { ANNOUNCEMENT_TYPES, announcementType, timeAgo } from "../../utils/announcementMeta";

/**
 * Themed announcement (nutri_hrms style). One design per type:
 *  important — red alert band · quote — deep indigo, big quotation mark ·
 *  festival — saffron · event — teal with a date tile · achievement — gold ribbon ·
 *  notice — slate notice board · birthday / anniversary / holiday — automatic posts.
 * variant: "card" (feed), "full" (detail page), "compact" (dashboard).
 * Styles: `.anc*` in src/index.css.
 */
/** Full-size image viewer (matches the app's image bottom sheet). */
const ImageViewer = ({ src, title, onClose }) => {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={title || "Announcement image"} className="fixed inset-0 z-[60] flex flex-col bg-[#0E1122]/95" onClick={onClose}>
      <div className="flex items-center gap-3 px-4 py-3 text-white" onClick={(e) => e.stopPropagation()}>
        <p className="min-w-0 flex-1 truncate font-semibold">{title}</p>
        <button type="button" onClick={onClose} aria-label="Close" className="grid h-11 w-11 place-items-center rounded-lg hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
          <FiX size={20} />
        </button>
      </div>
      <div className="flex flex-1 items-center justify-center overflow-auto p-4">
        <img src={src} alt={title || ""} className="max-h-full max-w-full rounded-lg object-contain" onClick={(e) => e.stopPropagation()} />
      </div>
    </div>,
    document.body
  );
};

const AnnouncementCard = ({ a, variant = "card", isNew = false, onClick }) => {
  const [viewing, setViewing] = useState(false);
  const type = announcementType(a.category);
  const meta = ANNOUNCEMENT_TYPES[type];
  const Icon = meta.icon;
  const when = a.publishedAt || a.createdAt;
  const d = when ? new Date(when) : null;
  const message = a.description || "";
  const image = a.imageUrl || a.image;
  const clamp = variant !== "full";

  const body = (
    <>
      <span className="anc-band">
        <span className="anc-icon" aria-hidden="true">
          <Icon size={variant === "compact" ? 15 : 17} />
        </span>
        <span className="anc-type">{meta.label}</span>
        {a.pinned ? (
          <span className="anc-pin">
            <FiBookmark size={11} aria-hidden="true" /> Pinned
          </span>
        ) : null}
        {isNew ? <span className="anc-new">New</span> : null}
      </span>

      {image && variant !== "compact" ? (
        // Click the image → full-size viewer (doesn't trigger the card's own click).
        <img
          className="anc-img cursor-zoom-in"
          src={image}
          alt=""
          loading="lazy"
          title="View image"
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); setViewing(true); }}
          onError={(e) => { e.currentTarget.style.display = "none"; }}
        />
      ) : null}

      <span className="anc-body">
        {type === "event" && d ? (
          <span className="anc-date" aria-hidden="true">
            <b>{d.getDate()}</b>
            <span>{d.toLocaleDateString("en-IN", { month: "short" })}</span>
          </span>
        ) : null}

        <span className="anc-text">
          {type === "quote" ? (
            <>
              <span className="anc-quote-mark" aria-hidden="true">“</span>
              <span className={`anc-quote${clamp ? " anc-clamp" : ""}`}>{message}</span>
              <span className="anc-quote-by">— {a.title}</span>
            </>
          ) : (
            <>
              <strong className="anc-title">{a.title}</strong>
              {variant === "full" ? (
                <span className="anc-msg anc-msg--full">
                  {message.split(/\n{2,}/).map((p, i) => (
                    <span key={i} className="anc-para">{p}</span>
                  ))}
                </span>
              ) : message ? (
                <span className="anc-msg anc-clamp">{message}</span>
              ) : null}
            </>
          )}
          <span className="anc-meta">
            {a.createdBy?.name || "HR"}
            {when ? ` · ${timeAgo(when)}` : ""}
          </span>
        </span>
      </span>
    </>
  );

  const cls = `anc anc--${variant}${isNew ? " is-new" : ""}`;
  const viewer = viewing ? <ImageViewer src={image} title={a.title} onClose={() => setViewing(false)} /> : null;
  return onClick ? (
    <>
      <button type="button" className={cls} data-type={type} onClick={onClick}>
        {body}
      </button>
      {viewer}
    </>
  ) : (
    <>
      <article className={cls} data-type={type}>
        {body}
      </article>
      {viewer}
    </>
  );
};

export default AnnouncementCard;
