import { createClient } from "redis";

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";

const redisClient = createClient({
  url: redisUrl,
  socket: {
    reconnectStrategy: (retries) => {
      // Allow up to 5 reconnect attempts, then stop
      if (retries >= 5) {
        console.warn("⚠️ Redis connection attempts exhausted. Caching will remain disabled.");
        return false; // Stop reconnecting
      }
      // Linear backoff: wait 1s, 2s, 3s, 4s, etc.
      return (retries + 1) * 1000;
    }
  }
});

redisClient.on("error", (err) => {
  // Only log if it's not a connection refused error or if it's the first few retries
  if (err.code !== "ECONNREFUSED") {
    console.error("❌ Redis Client Error:", err);
  }
});
redisClient.on("connect", () => console.log("⏳ Connecting to Redis..."));
redisClient.on("ready", () => console.log("✅ Redis Client Connected & Ready"));

let isConnected = false;

export const connectRedis = async () => {
  if (!isConnected) {
    try {
      await redisClient.connect();
      isConnected = true;
    } catch (err) {
      console.error("❌ Failed to connect to Redis:", err);
    }
  }
};

export { redisClient };
