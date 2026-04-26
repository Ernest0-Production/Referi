/**
 * Sliding-window rate limiter backed by Redis.
 * Used in Node.js runtime (API routes), not Edge middleware.
 *
 * Algorithm: fixed-window counter per key with TTL expiry.
 * Key format: `rl:{windowSec}:{identifier}`
 */
import { redis } from "./redis";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

export interface RateLimitRule {
  /** Identifier key (e.g. IP address or user ID) */
  key: string;
  /** Max requests in the window */
  limit: number;
  /** Window duration in seconds */
  windowSec: number;
}

export async function checkRateLimit(rule: RateLimitRule): Promise<RateLimitResult> {
  const redisKey = `rl:${rule.windowSec}:${rule.key}`;
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - rule.windowSec;

  // Use a sorted set: score = request timestamp, member = unique ID
  const pipeline = redis.pipeline();
  // Remove entries outside the window
  pipeline.zremrangebyscore(redisKey, "-inf", windowStart.toString());
  // Count remaining
  pipeline.zcard(redisKey);
  // Add current request
  pipeline.zadd(redisKey, now, `${now}-${Math.random()}`);
  // Set expiry on the key
  pipeline.expire(redisKey, rule.windowSec + 1);

  const results = await pipeline.exec();
  const count = (results?.[1]?.[1] as number) ?? 0;
  const resetAt = new Date((now + rule.windowSec) * 1000);
  const remaining = Math.max(0, rule.limit - count - 1);

  return {
    allowed: count < rule.limit,
    remaining,
    resetAt,
  };
}

/**
 * Predefined rate limit rules per spec-design-api section 6.
 */
export const RATE_LIMIT_RULES = {
  /** Public API: 60 req/min per IP */
  publicApi: (ip: string): RateLimitRule => ({ key: `ip:${ip}`, limit: 60, windowSec: 60 }),
  /** Authenticated API: 120 req/min per user */
  authedApi: (userId: string): RateLimitRule => ({
    key: `user:${userId}`,
    limit: 120,
    windowSec: 60,
  }),
  /** Auth endpoints: 10 req/min per IP (anti-brute-force) */
  auth: (ip: string): RateLimitRule => ({ key: `auth:${ip}`, limit: 10, windowSec: 60 }),
} as const;
