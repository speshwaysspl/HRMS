// Small in-memory response cache for SHARED, rarely-changing GET endpoints
// (departments, leave types, shifts, events, daily quote). Never use it for
// per-user or sensitive data: the cached response is served to every user.
//
// Freshness: entries are dropped as soon as any successful write hits the same
// /api/<resource> (see invalidateResource, called from liveDataMiddleware), on
// every PM2 instance via Socket.IO serverSideEmit. The TTL is only a backstop
// for changes that don't go through the API (cron jobs, seeding, manual DB edits).

const store = new Map(); // key -> { body, expires, resource }
const MAX_ENTRIES = 500;
let io = null;

export const stats = { hits: 0, misses: 0, invalidations: 0 };

// Call once with the Socket.IO server so invalidations reach other processes.
export const attachCacheInvalidation = (ioServer) => {
  io = ioServer;
  io.on("cache:invalidate", (resource) => dropResource(resource));
};

const dropResource = (resource) => {
  for (const [key, entry] of store) if (entry.resource === resource) store.delete(key);
  stats.invalidations++;
};

// Drop a resource's entries here and on every other server process.
export const invalidateResource = (resource) => {
  dropResource(resource);
  try {
    io?.serverSideEmit("cache:invalidate", resource);
  } catch (err) {
    console.error("cache invalidate broadcast failed:", err.message);
  }
};

/**
 * Cache successful JSON responses of a GET route for `ttlSeconds`.
 * The key is the full URL (path + query), so ?activeOnly=true is cached separately.
 */
export const cacheShared = (resource, ttlSeconds = 300) => (req, res, next) => {
  if (req.method !== "GET" || process.env.DISABLE_API_CACHE === "true") return next();
  const key = req.originalUrl;
  const hit = store.get(key);
  if (hit && hit.expires > Date.now()) {
    stats.hits++;
    res.set("X-Cache", "HIT");
    return res.status(200).json(hit.body);
  }
  stats.misses++;
  res.set("X-Cache", "MISS");
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode === 200 && body && body.success !== false) {
      if (store.size >= MAX_ENTRIES) store.delete(store.keys().next().value); // drop oldest
      store.set(key, { body, expires: Date.now() + ttlSeconds * 1000, resource });
    }
    return originalJson(body);
  };
  next();
};
