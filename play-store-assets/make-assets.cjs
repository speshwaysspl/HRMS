// Google Play store assets for Speshway HRMS (folder layout as nutri_hrms;
// screenshot style after greytHR: bold colour per screen, tilted phone that
// runs off the edge, long soft shadow, short headline top or bottom).
// Run from repo root:
//   node play-store-assets/make-assets.cjs           → app icon + feature graphic
//   node play-store-assets/make-assets.cjs screens   → framed phone / 7" / 10" screenshots
// Raw phone screenshots go in play-store-assets/raw-screenshots (named by screen,
// e.g. 3-home.jpg — the keyword picks the caption). Play accepts 2–8 per type.
const sharp = require(process.cwd() + "/server/node_modules/sharp");
const fs = require("fs");
const path = require("path");
const out = "play-store-assets";

const WHITE = "#ffffff";
const NAVY = "#0E1122"; // brand950 — same as the app's splash / login
const BEZEL = "#05060D";
const BEZEL_EDGE = "#2B3252";
const GREEN = "#84C088"; // accent300 — second caption line
const LOGO = "mobile/assets/logo.png";

const canvas = (w, h, bg = WHITE) => sharp({ create: { width: w, height: h, channels: 4, background: bg } });
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

async function brandAssets() {
  // 512×512 app icon: logo on white.
  const logo = await sharp(LOGO).resize({ width: 420, height: 420, fit: "inside" }).png().toBuffer();
  await canvas(512, 512).composite([{ input: logo, gravity: "center" }])
    .flatten({ background: WHITE }).png().toFile(`${out}/1-app-icon/app-icon-512x512.png`);

  // 1024×500 feature graphic: navy, logo tile + wordmark + tagline.
  const tile = await sharp(LOGO).resize({ width: 150, height: 150, fit: "inside" }).png().toBuffer();
  const tileBg = Buffer.from(`<svg width="200" height="200"><rect width="200" height="200" rx="44" fill="#ffffff"/></svg>`);
  const logoTile = await sharp(tileBg).composite([{ input: tile, gravity: "center" }]).png().toBuffer();
  const text = Buffer.from(`<svg width="1024" height="500" xmlns="http://www.w3.org/2000/svg">
    <defs><radialGradient id="g" cx="0.05" cy="0.95" r="0.7"><stop offset="0" stop-color="#3F8B45" stop-opacity="0.45"/><stop offset="1" stop-color="#3F8B45" stop-opacity="0"/></radialGradient>
    <radialGradient id="b" cx="1" cy="0" r="0.7"><stop offset="0" stop-color="#5C6FAB" stop-opacity="0.45"/><stop offset="1" stop-color="#5C6FAB" stop-opacity="0"/></radialGradient></defs>
    <rect width="1024" height="500" fill="url(#g)"/><rect width="1024" height="500" fill="url(#b)"/>
    <text x="340" y="215" font-family="Segoe UI, Arial" font-size="64" font-weight="700" fill="#FFFFFF">Speshway HRMS</text>
    <text x="342" y="275" font-family="Segoe UI, Arial" font-size="34" font-weight="600" fill="${GREEN}">Your workday starts here.</text>
    <text x="342" y="335" font-family="Segoe UI, Arial" font-size="28" font-weight="500" fill="#B0BBDF">Attendance · Leave · Payslips · Tasks</text></svg>`);
  await canvas(1024, 500, NAVY).composite([{ input: text, top: 0, left: 0 }, { input: logoTile, top: 150, left: 100 }])
    .flatten({ background: NAVY }).png().toFile(`${out}/2-feature-graphic/feature-graphic-1024x500.png`);
  console.log("App icon + feature graphic written");
}

// ---- Screenshots: greytHR-style panorama ----------------------------------
// All cards are drawn as ONE wide strip and then sliced, so phones and their
// long shadows run across card borders: card 1's phone continues into card 2,
// card 2's phone becomes card 3's big tilted phone (like greytHR's listing).
// Cards 4–5 stand alone with an upright phone; card 6 is the splash brand card.
//
// CARDS: background + headline per card. PHONES: which raw screenshot (by
// file-name keyword), where it sits on the strip (x in card widths from the
// strip's left, y as a fraction of the height), height and tilt.
const CARDS = [
  { bg: "#6D3BD8", ink: "#FFFFFF", caption: ["Your whole day,", "in one app"], at: "top" },
  { bg: "#3F8B45", ink: "#FFFFFF", caption: ["Everything HR is now", "in your pocket"], at: "top" },
  { bg: "#14B4E6", ink: "#0E1122", caption: ["Check in from", "office or home"], at: "bottom" },
  { bg: "#F28C28", ink: "#0E1122", caption: ["One secure login", "for every employee"], at: "top" },
  { bg: "#3F8B45", ink: "#FFFFFF", caption: ["Your digital ID,", "always with you"], at: "bottom" },
  { bg: "#5C6FAB", ink: "#FFFFFF", caption: ["Your workday", "starts here"], at: "top" }
];
// Which cards share one strip (phones may cross between them). Others stand
// alone, so nothing — phone or shadow — can leak into a neighbouring card.
const GROUPS = [[0, 3], [3, 4], [4, 5], [5, 6]];
const PHONES = [
  { file: "home", x: 0.95, y: 0.72, ph: 0.82, tilt: -22 }, // card 1 → spills into card 2
  { file: "attendance", x: 2.34, y: 0.39, ph: 0.78, tilt: -26 }, // starts at card 2's edge → card 3
  { file: "login", x: 3.5, y: 0.585, ph: 0.70, tilt: 0 }, // card 4, upright, whole phone
  { file: "profile", x: 4.5, y: 0.415, ph: 0.70, tilt: 0 }, // card 5, upright, whole phone
  { file: "splash", x: 5.58, y: 0.74, ph: 0.84, tilt: -20 } // card 6, brand close, tilted
];

// #rrggbb lighter (amt > 0) or darker (amt < 0).
const shade = (hex, amt) => {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v) => Math.max(0, Math.min(255, Math.round(amt >= 0 ? v + (255 - v) * amt : v * (1 + amt))));
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(ch);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
};

// Phone: screenshot with rounded corners and a camera punch-hole, in a dark
// bezel with a rim and side buttons.
async function phoneImage(file, shotH) {
  const shot = await sharp(file).resize({ height: shotH }).toBuffer();
  const shotW = (await sharp(shot).metadata()).width;
  const r = Math.round(shotW * 0.085);
  const mask = Buffer.from(`<svg width="${shotW}" height="${shotH}"><rect width="${shotW}" height="${shotH}" rx="${r}" ry="${r}"/></svg>`);
  const cam = Math.round(shotW * 0.028), cy = Math.round(shotH * 0.022);
  const camera = Buffer.from(`<svg width="${shotW}" height="${shotH}"><circle cx="${shotW / 2}" cy="${cy}" r="${cam}" fill="#05060D"/><circle cx="${shotW / 2 - cam * 0.3}" cy="${cy - cam * 0.3}" r="${cam * 0.28}" fill="#2B3252"/></svg>`);
  const screen = await sharp(shot).composite([{ input: mask, blend: "dest-in" }, { input: camera }]).png().toBuffer();
  const bz = Math.round(shotW * 0.038), btn = Math.round(bz * 0.55);
  const fw = shotW + bz * 2, fh = shotH + bz * 2, rim = Math.max(2, Math.round(bz * 0.2));
  const svg = `<svg width="${fw + btn * 2}" height="${fh}" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="${fh * 0.20}" width="${btn + 4}" height="${fh * 0.07}" rx="${btn / 2}" fill="#2A2F45"/>
    <rect x="0" y="${fh * 0.29}" width="${btn + 4}" height="${fh * 0.07}" rx="${btn / 2}" fill="#2A2F45"/>
    <rect x="${fw + btn - 4}" y="${fh * 0.24}" width="${btn + 4}" height="${fh * 0.1}" rx="${btn / 2}" fill="#2A2F45"/>
    <rect x="${btn}" y="0" width="${fw}" height="${fh}" rx="${r + bz}" ry="${r + bz}" fill="#10131F" stroke="#454B6B" stroke-width="${rim}"/></svg>`;
  return sharp(Buffer.from(svg)).composite([{ input: screen, top: bz, left: bz + btn }]).png().toBuffer();
}

// Builds one strip (a group of cards) for one size (w×h per card) and returns one PNG per card.
async function panorama(rawFiles, w, h, CARDS, PHONES) {
  const n = CARDS.length, PW = w * n;
  const pad = h; // margin so phones/shadows can extend past the strip
  const SW = PW + pad * 2, SH = h + pad * 2;

  // Card backgrounds: each its own colour with a soft diagonal gradient.
  const bgSvg = `<svg width="${SW}" height="${SH}" xmlns="http://www.w3.org/2000/svg"><defs>${CARDS.map((c, i) =>
    `<linearGradient id="g${i}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${shade(c.bg, 0.1)}"/><stop offset="1" stop-color="${shade(c.bg, -0.12)}"/></linearGradient>`).join("")}</defs>
    ${CARDS.map((c, i) => `<rect x="${pad + i * w}" y="0" width="${w}" height="${SH}" fill="url(#g${i})"/>`).join("")}</svg>`;

  const layers = [];
  const phones = [];
  for (const P of PHONES) {
    const file = rawFiles.find((f) => f.toLowerCase().includes(P.file));
    if (!file) continue;
    let phone = await phoneImage(file, Math.round(h * P.ph));
    if (P.tilt) phone = await sharp(phone).rotate(P.tilt, { background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
    const m = await sharp(phone).metadata();
    const px = pad + Math.round(P.x * w - m.width / 2);
    const py = pad + Math.round(P.y * h - m.height / 2);

    // Long hard shadow cast down-left (darker band over whatever card it crosses).
    const sil = await sharp(phone).ensureAlpha().linear([0, 0, 0, 1], [0, 0, 0, 0]).png().toBuffer();
    const stamp = await sharp(sil).ensureAlpha().linear([1, 1, 1, 0.035], [0, 0, 0, 0]).png().toBuffer();
    const step = Math.round(w * 0.02);
    for (let i = 1; i <= 26; i++) layers.push({ input: stamp, top: py + i * step, left: px - i * step });
    const contact = await sharp(sil).ensureAlpha().linear([1, 1, 1, 0.35], [0, 0, 0, 0]).blur(Math.max(6, Math.round(w * 0.012))).png().toBuffer();
    layers.push({ input: contact, top: py + Math.round(w * 0.012), left: px - Math.round(w * 0.006) });
    phones.push({ input: phone, top: py, left: px });
  }

  // Headlines, per card, on top of everything.
  const fs1 = Math.round(w * 0.066), capH = Math.round(fs1 * 2.9);
  const captions = CARDS.map((c, i) => ({
    input: Buffer.from(`<svg width="${w}" height="${capH}" xmlns="http://www.w3.org/2000/svg">
      <text x="50%" y="${Math.round(fs1 * 1.1)}" text-anchor="middle" font-family="Segoe UI Semibold, Segoe UI, Arial" font-weight="600" font-size="${fs1}" fill="${c.ink}">${esc(c.caption[0])}</text>
      <text x="50%" y="${Math.round(fs1 * 2.35)}" text-anchor="middle" font-family="Segoe UI Semibold, Segoe UI, Arial" font-weight="600" font-size="${fs1}" fill="${c.ink}">${esc(c.caption[1])}</text></svg>`),
    left: pad + i * w,
    top: pad + (c.at === "top" ? Math.round(h * 0.055) : h - capH - Math.round(h * 0.045))
  }));

  // Shadows first, then phones, then headlines.
  const strip = await sharp(Buffer.from(bgSvg)).composite([...layers, ...phones, ...captions]).png().toBuffer();
  return Promise.all(CARDS.map((c, i) =>
    sharp(strip).extract({ left: pad + i * w, top: pad, width: w, height: h }).flatten({ background: c.bg }).png().toBuffer()));
}

// Slices the strip into exact 9:16 store images for phone / 7" / 10".
async function screens() {
  const raw = `${out}/raw-screenshots`;
  const files = fs.readdirSync(raw).filter((f) => /\.(png|jpe?g)$/i.test(f)).map((f) => path.join(raw, f));
  const names = ["1-home", "2-everything-hr", "3-attendance", "4-login", "5-profile", "6-splash"];
  const targets = [
    ["3-phone-screenshots", 1080, 1920],
    ["4-tablet-7inch-screenshots", 1215, 2160],
    ["5-tablet-10inch-screenshots", 1620, 2880]
  ];
  for (const [dir, w, h] of targets) {
    for (const old of fs.readdirSync(`${out}/${dir}`)) fs.unlinkSync(`${out}/${dir}/${old}`);
    const cards = [];
    for (const [from, to] of GROUPS) {
      const phones = PHONES.filter((p) => p.x >= from && p.x < to).map((p) => ({ ...p, x: p.x - from }));
      cards.push(...(await panorama(files, w, h, CARDS.slice(from, to), phones)));
    }
    await Promise.all(cards.map((buf, i) => fs.promises.writeFile(`${out}/${dir}/${names[i]}.png`, buf)));
  }
  console.log(`Wrote ${CARDS.length} connected screenshots × 3 sizes`);
}

(process.argv[2] === "screens" ? screens() : brandAssets()).catch((e) => { console.error(e); process.exit(1); });
