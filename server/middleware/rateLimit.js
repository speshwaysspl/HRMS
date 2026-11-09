import rateLimit, { ipKeyGenerator } from "express-rate-limit";

// Real client IP: traffic arrives via Cloudflare Tunnel -> nginx -> Node, so
// req.ip is the proxy. Cloudflare sets CF-Connecting-IP to the visitor's IP.
const clientIp = (req) =>
  req.get("cf-connecting-ip") || req.get("x-real-ip") || req.ip || "unknown";

const handler = (req, res, _next, options) =>
  res.status(options.statusCode).json({
    success: false,
    error: "Too many requests. Please wait a moment and try again.",
  });

const base = {
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler,
  keyGenerator: (req) => ipKeyGenerator(clientIp(req)),
};

// Every /api request. Generous because a whole office can share one public IP
// and the app polls/refreshes live data.
export const apiLimiter = rateLimit({
  ...base,
  windowMs: 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_API_PER_MIN) || 600,
});

// Login: per IP + email, so one person's typos can't lock out the office and
// password guessing against one account is capped.
export const loginLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  keyGenerator: (req) =>
    `${ipKeyGenerator(clientIp(req))}:${String(req.body?.email || "").toLowerCase().trim()}`,
});

// Password reset / OTP endpoints send emails and accept short codes.
export const passwordResetLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 5,
});

// Public, unauthenticated endpoints (account-deletion request, email leave actions).
export const publicLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 30,
});

// Opening short links: a whole office may share one IP. Codes are 7 random
// characters from a 56-symbol alphabet, so guessing is impractical anyway.
export const linkResolveLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 300,
});
