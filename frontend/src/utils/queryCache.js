import { useCallback, useEffect, useRef, useState } from "react";
import { useLiveData } from "../context/NotificationContext";

import { getEntry, hasCached, setCached } from "./queryStore";
export { clearQueryCache, getCached, setCached } from "./queryStore";

// Stale-while-revalidate cache for API reads (same idea as the Flutter app's
// DataCache): a screen renders the last data instantly, then refreshes in the
// background. In memory only, so nothing private is written to disk, and it is
// cleared on login/logout (see AuthContext).

/**
 * @param {string|null} key     unique cache key (include params); null skips fetching
 * @param {() => Promise<any>} fetcher  returns the data to cache
 * @param {{ live?: string[], maxAgeMs?: number, keepPrevious?: boolean }} options
 *   live: /api/<resource> names that trigger a background refetch on change
 *   maxAgeMs: cached data younger than this is shown without refetching
 *   keepPrevious: when the key changes to one with no cache (new search text,
 *     new page), keep showing the previous data while loading instead of
 *     dropping back to the loading state. Use for search/paging screens.
 */
export const useCachedQuery = (key, fetcher, { live = [], maxAgeMs = 0, keepPrevious = false } = {}) => {
  const entry = key ? getEntry(key) : undefined;
  const [data, setData] = useState(entry?.data);
  const [loading, setLoading] = useState(!entry && !!key); // true only with nothing to show
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const keyRef = useRef(key);
  keyRef.current = key;
  const keepPreviousRef = useRef(keepPrevious);
  keepPreviousRef.current = keepPrevious;
  const dataRef = useRef(data);
  dataRef.current = data;

  const run = useCallback(async () => {
    const k = keyRef.current;
    if (!k) return;
    const showingData = hasCached(k) || (keepPreviousRef.current && dataRef.current !== undefined);
    showingData ? setRefreshing(true) : setLoading(true);
    try {
      const result = await fetcherRef.current();
      setCached(k, result);
      if (keyRef.current === k) {
        setData(result);
        setError(null);
      }
    } catch (err) {
      if (keyRef.current === k) setError(err);
    } finally {
      if (keyRef.current === k) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  // Key changed (page, search, filters): show that key's cache, then revalidate.
  useEffect(() => {
    if (!key) return;
    const e = getEntry(key);
    if (e) {
      setData(e.data);
      setLoading(false);
    } else if (keepPrevious) {
      setRefreshing(true); // old rows stay visible; `refreshing` signals the wait
    } else {
      setData(undefined);
      setLoading(true);
    }
    setError(null);
    if (e && maxAgeMs && Date.now() - e.at < maxAgeMs) return;
    run();
  }, [key, maxAgeMs, run]);

  useLiveData(live, run);

  // Optimistic local update (e.g. after delete) that also updates the cache.
  const mutate = useCallback((updater) => {
    setData((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      if (keyRef.current) setCached(keyRef.current, next);
      return next;
    });
  }, []);

  return { data, loading, refreshing, error, refetch: run, mutate };
};
