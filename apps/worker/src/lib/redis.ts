import { Redis } from "ioredis";

if (!process.env.REDIS_URL) {
  throw new Error("REDIS_URL environment variable is required");
}

// Shared Redis connection for BullMQ.
// keepAlive prevents the connection dropping on idle periods (Upstash closes idle TLS sockets).
// retryStrategy caps the backoff at 10 s to avoid long reconnection gaps in production.
export const redis = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null, // required for BullMQ blocking XREAD operations
  enableReadyCheck: false,
  keepAlive: 30_000,          // 30 s TCP keepalive — avoids silent disconnects
  connectTimeout: 10_000,     // fail fast if Upstash is unreachable
  retryStrategy: (times) => Math.min(times * 500, 10_000), // cap at 10 s
});

redis.on("error", (err) => {
  console.error("Redis connection error:", err.message);
});

redis.on("connect", () => {
  console.log("Redis connected");
});
