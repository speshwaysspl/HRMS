import { redisClient } from "../utils/redis.js";
import jwt from "jsonwebtoken";

export const globalCacheMiddleware = async (req, res, next) => {
  // 1. Exclude non-cacheable routes (auth, health, metrics)
  if (req.path.startsWith("/auth") || req.path.startsWith("/health") || req.path.startsWith("/metrics")) {
    return next();
  }

  // Exclude binary, upload, and export/import endpoints
  const isExcludedPath = 
    req.path.includes("/pdf") || 
    req.path.includes("/excel") || 
    req.path.includes("/export") || 
    req.path.includes("/import") ||
    req.path.includes("/upload");
  
  if (isExcludedPath) {
    return next();
  }

  // Extract feature name from request path (e.g. /department -> department)
  const parts = req.path.split("/").filter(Boolean);
  if (parts.length === 0) {
    return next();
  }
  const feature = parts[0];

  // For GET requests: Try to serve from Redis cache
  if (req.method === "GET") {
    if (!redisClient.isOpen) {
      return next();
    }

    try {
      // Decode JWT token if present to construct a user-specific cache key
      let userId = "guest";
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.split(" ")[1];
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          userId = decoded._id || decoded.id || "guest";
        } catch (err) {
          // Ignore invalid/expired token, authMiddleware will handle authentication errors
        }
      }

      // Generate a unique cache key based on feature, user, and the full original URL (with query params)
      const cacheKey = `cache:${feature}:${userId}:${req.originalUrl || req.url}`;

      const cachedResponse = await redisClient.get(cacheKey);
      if (cachedResponse) {
        try {
          const parsed = JSON.parse(cachedResponse);
          return res.status(200).json(parsed);
        } catch (e) {
          return res.status(200).send(cachedResponse);
        }
      }

      // Intercept res.json to capture response body and cache it
      const originalJson = res.json;
      res.json = function (body) {
        const result = originalJson.call(this, body);
        
        // Cache successful responses (status 2xx)
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // Cache for 10 minutes (600 seconds)
          redisClient.set(cacheKey, JSON.stringify(body), {
            EX: 600
          }).catch(err => console.error("❌ Redis Cache Set Error:", err));
        }
        
        return result;
      };

      return next();
    } catch (error) {
      console.error("❌ Cache Middleware Error:", error);
      return next();
    }
  }

  // For write requests (POST, PUT, DELETE, PATCH): Invalidate corresponding caches
  if (["POST", "PUT", "DELETE", "PATCH"].includes(req.method)) {
    if (!redisClient.isOpen) {
      return next();
    }

    try {
      const originalJson = res.json;
      res.json = function (body) {
        const result = originalJson.call(this, body);
        
        // If the write operation was successful, invalidate cache
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const featuresToInvalidate = [feature, "dashboard"];
          
          invalidateFeatureCache(featuresToInvalidate)
            .then(() => {
              console.log(`🧹 Invalidated Redis cache for features: ${featuresToInvalidate.join(", ")}`);
            })
            .catch(err => console.error("❌ Redis Cache Invalidation Error:", err));
        }
        
        return result;
      };
    } catch (error) {
      console.error("❌ Cache Invalidation Setup Error:", error);
    }
  }

  next();
};

/**
 * Scan and delete all Redis keys matching patterns for specified features
 * @param {string[]} features - Array of feature names to invalidate
 */
async function invalidateFeatureCache(features) {
  try {
    for (const feature of features) {
      let cursor = 0;
      const pattern = `cache:${feature}:*`;
      do {
        const reply = await redisClient.scan(cursor, {
          MATCH: pattern,
          COUNT: 100
        });
        cursor = Number(reply.cursor);
        const keys = reply.keys;
        if (keys && keys.length > 0) {
          await redisClient.del(keys);
        }
      } while (cursor !== 0);
    }
  } catch (error) {
    console.error("❌ Error scanning and deleting cache keys:", error);
  }
}
