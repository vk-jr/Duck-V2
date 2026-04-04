import Redis from "ioredis";

let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL!, {
      maxRetriesPerRequest: 3,
    });
  }
  return redis;
}

/**
 * Check and increment a rate limit counter.
 * Returns true if the action is allowed, false if the limit is exceeded.
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const client = getRedis();
  const now = Math.floor(Date.now() / 1000);
  const windowKey = Math.floor(now / windowSeconds);
  const redisKey = `rl:${key}:${windowKey}`;

  const pipeline = client.pipeline();
  pipeline.incr(redisKey);
  pipeline.expire(redisKey, windowSeconds);
  const results = await pipeline.exec();

  const count = (results?.[0]?.[1] as number) ?? 1;
  const allowed = count <= limit;
  const remaining = Math.max(0, limit - count);
  const resetAt = (windowKey + 1) * windowSeconds * 1000;

  return { allowed, remaining, resetAt };
}

/**
 * Rate limit helpers for each action type
 */
export async function checkImageGenerationLimit(
  userId: string
): Promise<{ allowed: boolean; remaining: number }> {
  const windowSeconds = 3600; // 1 hour
  const now = Math.floor(Date.now() / 1000 / windowSeconds);
  return checkRateLimit(`gen:${userId}:${now}`, 10, windowSeconds);
}

export async function checkBrandCreationLimit(
  userId: string
): Promise<{ allowed: boolean; remaining: number }> {
  const today = new Date().toISOString().slice(0, 10);
  return checkRateLimit(`brand:${userId}:${today}`, 3, 86400);
}

export async function checkGuidelinesLimit(
  userId: string
): Promise<{ allowed: boolean; remaining: number }> {
  const today = new Date().toISOString().slice(0, 10);
  return checkRateLimit(`guidelines:${userId}:${today}`, 5, 86400);
}

export async function checkQualityAuditLimit(
  userId: string
): Promise<{ allowed: boolean; remaining: number }> {
  const today = new Date().toISOString().slice(0, 10);
  return checkRateLimit(`audit:${userId}:${today}`, 20, 86400);
}

export async function checkPosterGenerationLimit(
  userId: string
): Promise<{ allowed: boolean; remaining: number }> {
  const today = new Date().toISOString().slice(0, 10);
  return checkRateLimit(`poster:${userId}:${today}`, 20, 86400);
}
