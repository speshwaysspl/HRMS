// Optional pagination: only active when the client sends ?page=. Old clients
// (and the Flutter app) that don't send it keep getting the full list.
export const readPage = (req, { defaultLimit = 25, maxLimit = 100 } = {}) => {
  if (req.query.page === undefined) return null;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(req.query.limit, 10) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
};

export const pageMeta = (p, total) => ({ page: p.page, limit: p.limit, total, pages: Math.max(1, Math.ceil(total / p.limit)) });

// Escape user text for use inside a MongoDB $regex.
export const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
