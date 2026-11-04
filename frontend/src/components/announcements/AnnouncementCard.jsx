import React from "react";
import { FiBookmark } from "react-icons/fi";
import { ANNOUNCEMENT_TYPES, announcementType, timeAgo } from "../../utils/announcementMeta";

/**
 * Themed announcement (nutri_hrms style). One design per type:
 *  important — red alert band · quote — deep indigo, big quotation mark ·
 *  festival — saffron · event — teal with a date tile · achievement — gold ribbon ·
 *  notice — slate notice board · birthday / anniversary / holiday — automatic posts.
 * variant: "card" (feed), "full" (detail page), "compact" (dashboard).
 * Styles: `.anc*` in src/index.css.
 */
const AnnouncementCard = ({ a, variant = "card", isNew = false, onClick }) => {
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
        <img
          className="anc-img"
          src={image}
          alt=""
          loading="lazy"
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
  return onClick ? (
    <button type="button" className={cls} data-type={type} onClick={onClick}>
      {body}
    </button>
  ) : (
    <article className={cls} data-type={type}>
      {body}
    </article>
  );
};

export default AnnouncementCard;
