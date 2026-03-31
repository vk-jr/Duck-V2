import { Redis } from "ioredis";

if (!process.env.REDIS_URL) {
  throw new Error("REDIS_URL environment variable is required");
}

// Shared Redis connection for BullMQ
export const redis = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null, // Required for BullMQ blocking operations
  enableReadyCheck: false,
});

redis.on("error", (err) => {
  console.error("Redis connection error:", err.message);
});

redis.on("connect", () => {
  console.log("Redis connected");
});
