import crypto from "crypto";
import ShortLink from "../models/ShortLink.js";

// Short links may only point at our own sites, so the trusted domain can't be
// used to disguise phishing links. Subdomains of each host are allowed.
const ALLOWED_HOSTS = (process.env.SHORTLINK_ALLOWED_HOSTS || "speshwayhrms.com,speshway.com")
  .split(",").map((h) => h.trim().toLowerCase()).filter(Boolean);
const PUBLIC_BASE = (process.env.SHORTLINK_BASE_URL || process.env.CLIENT_URL || "https://speshwayhrms.com").replace(/\/+$/, "");
const DEFAULT_TTL_DAYS = 90;
const MAX_TTL_DAYS = 365;
const ALPHABET = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no look-alikes
const RESERVED = new Set(["api", "admin", "login", "s", "static", "assets", "images", "uploads", "socket", "health"]);

const randomCode = (len = 7) => {
  const bytes = crypto.randomBytes(len);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
};

export const validateTarget = (raw) => {
  let url;
  try { url = new URL(String(raw || "").trim()); } catch { return { error: "Enter a full link starting with https://" }; }
  if (url.protocol !== "https:") return { error: "Only https:// links can be shortened" };
  if (url.username || url.password) return { error: "Links with embedded credentials aren't allowed" };
  const host = url.hostname.toLowerCase();
  const ok = ALLOWED_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  if (!ok) return { error: `Only links to ${ALLOWED_HOSTS.join(", ")} can be shortened` };
  return { url: url.toString() };
};

const isLive = (link) => link.active && (!link.expiresAt || link.expiresAt > new Date());

const present = (link) => {
  const o = link.toJSON ? link.toJSON() : link;
  return {
    _id: o._id, code: o.code, shortUrl: `${PUBLIC_BASE}/s/${o.code}`, targetUrl: o.targetUrl,
    title: o.title, clicks: o.clicks, lastClickedAt: o.lastClickedAt, expiresAt: o.expiresAt,
    active: o.active, status: isLive(o) ? "active" : o.active ? "expired" : "disabled",
    createdBy: o.createdBy && typeof o.createdBy === "object" ? { _id: o.createdBy._id, name: o.createdBy.name } : o.createdBy,
    createdAt: o.createdAt,
  };
};

// POST /api/links { url, title?, alias?, expiresInDays? }  (admin/HR)
export const createShortLink = async (req, res) => {
  try {
    const { url, title = "", alias, expiresInDays } = req.body || {};
    const target = validateTarget(url);
    if (target.error) return res.status(400).json({ success: false, error: target.error });

    let days = expiresInDays === null || expiresInDays === 0 ? null : Number(expiresInDays ?? DEFAULT_TTL_DAYS);
    if (days !== null && (!Number.isFinite(days) || days < 1 || days > MAX_TTL_DAYS)) {
      return res.status(400).json({ success: false, error: `Expiry must be between 1 and ${MAX_TTL_DAYS} days` });
    }
    const expiresAt = days ? new Date(Date.now() + days * 86400000) : null;

    let code;
    if (alias) {
      code = String(alias).trim();
      if (!/^[a-zA-Z0-9-]{3,32}$/.test(code) || RESERVED.has(code.toLowerCase())) {
        return res.status(400).json({ success: false, error: "Alias must be 3–32 letters, numbers or dashes" });
      }
      if (await ShortLink.exists({ code })) return res.status(409).json({ success: false, error: "That alias is already taken" });
    } else {
      for (let i = 0; i < 5 && !code; i++) {
        const c = randomCode();
        if (!(await ShortLink.exists({ code: c }))) code = c;
      }
      if (!code) return res.status(500).json({ success: false, error: "Could not generate a code, try again" });
    }

    const link = await ShortLink.create({
      code, targetUrl: target.url, title: String(title).slice(0, 120), createdBy: req.user._id, expiresAt,
    });
    await link.populate("createdBy", "name");
    return res.status(201).json({ success: true, link: present(link) });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ success: false, error: "That alias is already taken" });
    console.error("createShortLink error:", error);
    return res.status(500).json({ success: false, error: "Could not create link" });
  }
};

// GET /api/links?q=&page=  (admin/HR)
export const listShortLinks = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const q = String(req.query.q || "").trim();
    const filter = q
      ? { $or: ["code", "title", "targetUrl"].map((f) => ({ [f]: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } })) }
      : {};
    const [links, total] = await Promise.all([
      ShortLink.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate("createdBy", "name"),
      ShortLink.countDocuments(filter),
    ]);
    return res.status(200).json({ success: true, links: links.map(present), total, page });
  } catch (error) {
    console.error("listShortLinks error:", error);
    return res.status(500).json({ success: false, error: "Could not load links" });
  }
};

// PATCH /api/links/:id { active?, title?, expiresInDays? }  (admin/HR)
export const updateShortLink = async (req, res) => {
  try {
    const link = await ShortLink.findById(req.params.id);
    if (!link) return res.status(404).json({ success: false, error: "Link not found" });
    const { active, title, expiresInDays } = req.body || {};
    if (typeof active === "boolean") link.active = active;
    if (typeof title === "string") link.title = title.slice(0, 120);
    if (expiresInDays !== undefined) {
      const days = expiresInDays === null || expiresInDays === 0 ? null : Number(expiresInDays);
      if (days !== null && (!Number.isFinite(days) || days < 1 || days > MAX_TTL_DAYS)) {
        return res.status(400).json({ success: false, error: `Expiry must be between 1 and ${MAX_TTL_DAYS} days` });
      }
      link.expiresAt = days ? new Date(Date.now() + days * 86400000) : null;
    }
    await link.save();
    await link.populate("createdBy", "name");
    return res.status(200).json({ success: true, link: present(link) });
  } catch (error) {
    console.error("updateShortLink error:", error);
    return res.status(500).json({ success: false, error: "Could not update link" });
  }
};

// DELETE /api/links/:id  (admin/HR)
export const deleteShortLink = async (req, res) => {
  try {
    const link = await ShortLink.findByIdAndDelete(req.params.id);
    if (!link) return res.status(404).json({ success: false, error: "Link not found" });
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("deleteShortLink error:", error);
    return res.status(500).json({ success: false, error: "Could not delete link" });
  }
};

// Looks up a live link and counts the click. Re-validates the target so a
// link can never redirect off our domains, even if the allow-list changed.
const resolve = async (code) => {
  if (!/^[a-zA-Z0-9-]{3,32}$/.test(String(code || ""))) return null;
  const link = await ShortLink.findOneAndUpdate(
    { code, active: true, $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] },
    { $inc: { clicks: 1 }, $set: { lastClickedAt: new Date() } },
    { new: true }
  );
  if (!link || validateTarget(link.targetUrl).error) return null;
  return link;
};

// GET /api/links/resolve/:code  (public) -> { url }   used by the web app's /s/:code page
export const resolveShortLink = async (req, res) => {
  try {
    const link = await resolve(req.params.code);
    if (!link) return res.status(404).json({ success: false, error: "This link has expired or doesn't exist" });
    return res.status(200).json({ success: true, url: link.targetUrl });
  } catch (error) {
    console.error("resolveShortLink error:", error);
    return res.status(500).json({ success: false, error: "Could not open link" });
  }
};

// GET /s/:code  (public) -> 302 redirect, for when /s/* is routed to the API
export const redirectShortLink = async (req, res) => {
  try {
    const link = await resolve(req.params.code);
    res.set("Cache-Control", "no-store");
    res.set("Referrer-Policy", "no-referrer");
    if (!link) return res.redirect(302, `${PUBLIC_BASE}/link-expired`);
    return res.redirect(302, link.targetUrl);
  } catch (error) {
    console.error("redirectShortLink error:", error);
    return res.redirect(302, PUBLIC_BASE);
  }
};
