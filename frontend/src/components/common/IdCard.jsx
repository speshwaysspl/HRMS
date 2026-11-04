import React, { forwardRef, useEffect, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { FaEnvelope, FaGlobe, FaMapMarkerAlt, FaPhoneAlt } from "react-icons/fa";
import { ID_CARD_ADDRESS, ID_CARD_EMAIL, ID_CARD_PHONE, ID_CARD_WEBSITE, buildIdCardQrPayload, parseIdCardPhoto } from "../../utils/idCard";

// Layout follows the nutri_hrms card (logo → big photo → dark lower panel with
// name, employee-ID pill and QR → scan footer), in Speshway brand colours.
// Flutter mirror: mobile/lib/widgets/id_card.dart — keep geometry in sync.
const NAVY = "#1C2344";
const NAVY_DEEP = "#161B35";
const GREEN = "#3F8B45";
export const ID_CARD_WIDTH = 320;
export const ID_CARD_HEIGHT = 550;

const Shell = forwardRef(({ children }, ref) => (
  <div
    ref={ref}
    onContextMenu={(e) => e.preventDefault()}
    style={{
      position: "relative",
      width: ID_CARD_WIDTH,
      height: ID_CARD_HEIGHT,
      background: "#ffffff",
      borderRadius: 20,
      overflow: "hidden",
      color: "#ffffff",
      textAlign: "left", // modal wrapper is text-center; rows must align left
      userSelect: "none",
      flexShrink: 0,
      fontFamily: "'Times New Roman', Times, serif",
    }}
  >
    {children}
  </div>
));

const Logo = ({ size = 56 }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
    <img src="/images/Logo.jpg" alt="" style={{ width: size, height: size, objectFit: "contain" }} />
    <div style={{ lineHeight: 1 }}>
      <div style={{ color: NAVY, fontWeight: 800, fontSize: 28, letterSpacing: "0.02em" }}>SPESHWAY</div>
      <div style={{ color: GREEN, fontWeight: 600, fontSize: 13, letterSpacing: "0.42em", marginTop: 4 }}>SOLUTIONS</div>
    </div>
  </div>
);

/** Shield icon for the footer (inline so html2canvas captures it). */
const Shield = () => (
  <svg width="26" height="30" viewBox="0 0 24 28" aria-hidden="true">
    <path d="M12 1 2 5v7c0 6.5 4.3 12.4 10 14 5.7-1.6 10-7.5 10-14V5L12 1Z" fill="none" stroke="#fff" strokeWidth="1.8" />
    <path d="m7.5 13.5 3 3 6-6" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const initials = (name = "") =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase() || "?";

/**
 * Front of the card. With `photoEditable`, the photo can be dragged to move
 * and scrolled to zoom (same interaction as nutri_hrms); changes go to
 * `onPhotoFitChange` and are only saved by the caller.
 */
export const IdCardFront = forwardRef(({ employee, photoEditable = false, photoFit, onPhotoFitChange }, ref) => {
  const name = employee?.userId?.name || "";
  const fit = parseIdCardPhoto(photoFit ?? employee?.idCardPhoto);
  const fitRef = useRef(fit);
  fitRef.current = fit;
  const wrapRef = useRef(null);
  const dragRef = useRef(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!photoEditable || !wrap) return undefined;
    const onWheel = (e) => {
      e.preventDefault();
      const cur = fitRef.current;
      onPhotoFitChange?.(parseIdCardPhoto({ ...cur, scale: cur.scale * (e.deltaY < 0 ? 1.08 : 0.92) }));
    };
    wrap.addEventListener("wheel", onWheel, { passive: false });
    return () => wrap.removeEventListener("wheel", onWheel);
  }, [photoEditable, onPhotoFitChange]);

  const onPointerDown = (e) => {
    if (!photoEditable) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, ox: fit.x, oy: fit.y };
  };
  const onPointerMove = (e) => {
    if (!photoEditable || !dragRef.current || !wrapRef.current) return;
    const box = wrapRef.current.getBoundingClientRect();
    onPhotoFitChange?.(parseIdCardPhoto({
      scale: fit.scale,
      x: dragRef.current.ox + ((e.clientX - dragRef.current.x) / box.width) * 100,
      y: dragRef.current.oy + ((e.clientY - dragRef.current.y) / box.height) * 100,
    }));
  };
  const onPointerUp = () => { dragRef.current = null; };

  return (
    <Shell ref={ref}>
      {/* Top-left corner accent + dark lower panel with a green wave edge */}
      <svg width={ID_CARD_WIDTH} height={ID_CARD_HEIGHT} viewBox="0 0 320 550" style={{ position: "absolute", inset: 0 }} aria-hidden="true">
        <path d="M0 0 H120 C80 6 30 22 0 48 Z" fill={NAVY} />
        {/* Symmetric arch centred under the photo */}
        <path d="M0 238 Q160 158 320 238 V256 Q160 176 0 256 Z" fill={GREEN} />
        <path d="M0 256 Q160 176 320 256 V550 H0 Z" fill={NAVY} />
      </svg>

      <div style={{ position: "absolute", top: 30, left: 0, right: 0 }}>
        <Logo />
      </div>

      <div
        ref={wrapRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        title={photoEditable ? "Drag to move · scroll to zoom" : undefined}
        style={{
          cursor: photoEditable && employee?.profileImage ? "grab" : undefined,
          touchAction: photoEditable ? "none" : undefined,
          position: "absolute", top: 108, left: (ID_CARD_WIDTH - 156) / 2, width: 156, height: 156,
          borderRadius: "50%", border: "5px solid #ffffff", boxShadow: `0 0 0 2px ${GREEN}`,
          overflow: "hidden", background: "#E5E7EB", display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        {employee?.profileImage ? (
          <img
            src={employee.profileImage}
            alt={name}
            draggable={false}
            style={{ width: "100%", height: "100%", objectFit: "cover", transform: `translate(${fit.x}%, ${fit.y}%) scale(${fit.scale})` }}
          />
        ) : (
          <span style={{ fontSize: 46, fontWeight: 700, color: NAVY }}>{initials(name)}</span>
        )}
      </div>

      <div style={{ position: "absolute", top: 278, left: 16, right: 16, textAlign: "center" }}>
        <div style={{ fontWeight: 800, fontSize: name.length > 22 ? 17 : 21, textTransform: "uppercase", letterSpacing: "0.03em", lineHeight: 1.15 }}>
          {name || "—"}
        </div>
        <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.8)", marginTop: 4 }}>{employee?.designation || ""}</div>
        <div style={{ height: 1, width: 210, margin: "10px auto 6px", background: "rgba(255,255,255,0.45)" }} />
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em" }}>EMPLOYEE ID</div>
        <div
          style={{
            display: "inline-block", marginTop: 5, minWidth: 140, padding: "4px 18px", borderRadius: 999,
            border: "1.5px solid #ffffff", background: "rgba(255,255,255,0.12)", fontWeight: 700, fontSize: 15, letterSpacing: "0.04em",
          }}
        >
          {employee?.employeeId || "—"}
        </div>
        <div style={{ margin: "8px auto 0", width: 96, padding: 6, borderRadius: 10, background: "#ffffff", border: "1.5px solid #ffffff" }}>
          <QRCodeSVG value={buildIdCardQrPayload(employee)} size={84} level="M" bgColor="#FFFFFF" fgColor="#000000" style={{ display: "block" }} />
        </div>
      </div>

      <div
        style={{
          position: "absolute", left: 0, right: 0, bottom: 0, height: 44, background: NAVY_DEEP,
          borderTop: `3px solid ${GREEN}`, display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
        }}
      >
        <Shield />
        <div style={{ fontSize: 11.5, fontWeight: 600, lineHeight: 1.25 }}>
          Scan to save contact
          <br />
          Name · Phone · Employee ID
        </div>
      </div>
    </Shell>
  );
});

const ContactRow = ({ icon: Icon, label, children }) => (
  <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginTop: 12 }}>
    <span style={{ width: 34, height: 34, borderRadius: "50%", background: NAVY, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <Icon size={15} />
    </span>
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 11.5, fontWeight: 800, color: GREEN, letterSpacing: "0.06em" }}>{label}</div>
      <div style={{ fontSize: 12, color: "#111827", lineHeight: 1.4, marginTop: 1 }}>{children}</div>
    </div>
  </div>
);

// Back follows the nutri_hrms back: logo, CONFIDENTIAL badge + return notice,
// then contact / office / website / email rows, navy wave footer.
export const IdCardBack = forwardRef((_props, ref) => (
  <Shell ref={ref}>
    <svg width={ID_CARD_WIDTH} height={ID_CARD_HEIGHT} viewBox="0 0 320 550" style={{ position: "absolute", inset: 0 }} aria-hidden="true">
      <path d="M200 0 H320 V60 C300 30 260 8 200 0 Z" fill={NAVY} />
      <path d="M0 470 C100 440 220 500 320 462 V476 C220 514 100 454 0 484 Z" fill={GREEN} />
      <path d="M0 484 C100 454 220 514 320 476 V550 H0 Z" fill={NAVY} />
    </svg>

    <div style={{ position: "absolute", top: 34, left: 0, right: 0 }}>
      <Logo size={54} />
    </div>

    <div style={{ position: "absolute", top: 110, left: 18, right: 18, textAlign: "center", color: "#111827" }}>
      <span style={{ display: "inline-block", padding: "4px 18px", borderRadius: 999, background: NAVY, color: "#fff", fontWeight: 700, fontSize: 13, letterSpacing: "0.08em" }}>
        CONFIDENTIAL
      </span>
      <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.5, marginTop: 8 }}>
        This card is the property of <span style={{ color: GREEN, fontWeight: 700 }}>Speshway Solutions</span>.
        <br />
        If found, please return to the HR Department.
      </div>
    </div>

    <div style={{ position: "absolute", top: 212, left: 22, right: 18 }}>
      <ContactRow icon={FaPhoneAlt} label="CONTACT">{ID_CARD_PHONE}</ContactRow>
      <ContactRow icon={FaMapMarkerAlt} label="REGISTERED OFFICE">{ID_CARD_ADDRESS.join(" ")}</ContactRow>
      <ContactRow icon={FaGlobe} label="WEBSITE">{ID_CARD_WEBSITE}</ContactRow>
      <ContactRow icon={FaEnvelope} label="EMAIL">{ID_CARD_EMAIL}</ContactRow>
    </div>

    <div style={{ position: "absolute", bottom: 22, left: 0, right: 0, textAlign: "center", fontSize: 12, fontWeight: 700, letterSpacing: "0.14em" }}>
      SPESHWAY SOLUTIONS PVT. LTD.
    </div>
  </Shell>
));
