// Shared helpers for the employee ID card (web). Flutter mirrors these in
// mobile/lib/widgets/id_card.dart — keep the QR payload and address in sync.

export const ID_CARD_COMPANY = "SPESHWAY SOLUTIONS";
export const ID_CARD_WEBSITE = "www.speshway.com";
export const ID_CARD_EMAIL = "info@speshway.com";
export const ID_CARD_PHONE = "+91 9154986733";
export const ID_CARD_ADDRESS = [
  "Plot No 1/C, Sy No 83/1,",
  "Raidurgam Knowledge City Rd,",
  "panmaktha Hyderabad,",
  "Serilingampalle (M), Rai Durg,",
  "Telangana 500032",
];

const escapeMeCard = (value) =>
  String(value ?? "").replace(/([\\;:,"])/g, "\\$1").replace(/\s+/g, " ").trim();

/** MECARD contact (name, phone, employee ID) — phone cameras offer "Add contact". Kept short so it scans at card size. */
export const buildIdCardQrPayload = (employee) => {
  const name = escapeMeCard(employee?.userId?.name || ID_CARD_COMPANY);
  const phone = String(employee?.mobilenumber || "").replace(/[^\d+]/g, "");
  const code = escapeMeCard(employee?.employeeId || "");
  let card = `MECARD:N:${name};`;
  if (phone) card += `TEL:${phone.length === 10 ? `+91${phone}` : phone};`;
  if (code) card += `NOTE:${code};`;
  card += `URL:${ID_CARD_WEBSITE};`;
  return `${card};`;
};

export const formatIdCardPhone = (mobile) => {
  const digits = String(mobile || "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.length === 10 ? `+91 ${digits}` : `+${digits}`;
};

/**
 * Read an image file and return a square-cropped JPEG data URL (~480px).
 * Keeps the stored photo small (well under the server's 500 KB cap).
 */
export const fileToIdCardPhoto = (file, size = 480) =>
  new Promise((resolve, reject) => {
    if (!file || !["image/jpeg", "image/png", "image/jpg"].includes(file.type)) {
      reject(new Error("Only JPEG or PNG images are allowed."));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Couldn't read the image."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Couldn't read the image."));
      img.onload = () => {
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        // Bias the crop slightly upward so faces in portrait photos stay centred.
        const sy = img.height > img.width ? (img.height - side) * 0.3 : (img.height - side) / 2;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, size, size);
        ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });

/** Photo position inside the card circle — zoom 1–3.5, pan ±80% (server clamps the same). */
export const DEFAULT_ID_CARD_PHOTO = { scale: 1, x: 0, y: 0 };
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
export const parseIdCardPhoto = (value) => {
  const scale = Number(value?.scale);
  const x = Number(value?.x);
  const y = Number(value?.y);
  return {
    scale: Number.isFinite(scale) ? clamp(scale, 1, 3.5) : 1,
    x: Number.isFinite(x) ? clamp(x, -80, 80) : 0,
    y: Number.isFinite(y) ? clamp(y, -80, 80) : 0,
  };
};
