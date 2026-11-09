// Storage for useCachedQuery (utils/queryCache.js). Kept dependency-free so
// AuthContext can clear it on login/logout without import cycles.
const cache = new Map(); // key -> { data, at }
const MAX_ENTRIES = 100;

export const clearQueryCache = () => cache.clear();
export const hasCached = (key) => cache.has(key);
export const getEntry = (key) => cache.get(key);
export const getCached = (key) => cache.get(key)?.data;
export const setCached = (key, data) => {
  if (cache.size >= MAX_ENTRIES && !cache.has(key)) cache.delete(cache.keys().next().value);
  cache.set(key, { data, at: Date.now() });
};
