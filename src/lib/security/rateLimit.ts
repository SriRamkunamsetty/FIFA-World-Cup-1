/**
 * A minimal fixed-window rate limiter.
 *
 * This is intentionally in-memory: it is enough to protect a single demo
 * instance from accidental abuse (and from burning through AI API quota)
 * without adding an external dependency. It is process-local, so it will
 * NOT correctly rate-limit across multiple serverless instances or
 * horizontally scaled replicas — see README "Security notes" for what a
 * production deployment should use instead (e.g. Upstash/Redis).
 */

interface Bucket {
  count: number;
  windowStartedAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

export function checkRateLimit(
  key: string,
  max: number,
  windowMs: number,
  now: number = Date.now(),
): RateLimitResult {
  const existing = buckets.get(key);

  if (!existing || now - existing.windowStartedAt >= windowMs) {
    buckets.set(key, { count: 1, windowStartedAt: now });
    return { allowed: true, remaining: max - 1, retryAfterMs: 0 };
  }

  if (existing.count < max) {
    existing.count += 1;
    return { allowed: true, remaining: max - existing.count, retryAfterMs: 0 };
  }

  const retryAfterMs = windowMs - (now - existing.windowStartedAt);
  return { allowed: false, remaining: 0, retryAfterMs };
}

/** Exposed for tests only, so each test can start from a clean slate. */
export function _resetRateLimitStoreForTests(): void {
  buckets.clear();
}

/**
 * Best-effort client identifier. Trusts `x-forwarded-for` because this app
 * is designed to run behind a platform load balancer (e.g. Vercel); if you
 * deploy it directly on an untrusted network edge, replace this with a
 * connection-level source instead of a spoofable header.
 */
export function getClientKey(headers: Headers): string {
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() ?? 'unknown';
  }
  return 'unknown';
}
