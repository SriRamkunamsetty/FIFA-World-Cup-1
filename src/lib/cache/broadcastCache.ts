import { createHash } from 'node:crypto';
import type { BroadcastAiResult } from '@/lib/ai/types';

/**
 * Organizers often re-send the same routine announcement (e.g. "Gate B is
 * closing soon"). Caching by content hash avoids paying for and waiting on
 * a duplicate AI call for identical (message, languages) pairs — a direct,
 * measurable efficiency win with a two-line cost.
 */

interface CacheEntry {
  result: BroadcastAiResult;
  expiresAt: number;
}

const TTL_MS = 5 * 60 * 1000;
const MAX_ENTRIES = 200;

const cache = new Map<string, CacheEntry>();

export function cacheKeyFor(message: string, languages: readonly string[]): string {
  return createHash('sha256')
    .update(`${message}::${[...languages].sort().join(',')}`)
    .digest('hex');
}

export function getCachedBroadcast(key: string, now: number = Date.now()): BroadcastAiResult | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt < now) {
    cache.delete(key);
    return null;
  }
  return entry.result;
}

export function setCachedBroadcast(key: string, result: BroadcastAiResult, now: number = Date.now()): void {
  if (cache.size >= MAX_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey !== undefined) cache.delete(oldestKey);
  }
  cache.set(key, { result, expiresAt: now + TTL_MS });
}

/** Exposed for tests only, so each test can start from a clean slate. */
export function _resetBroadcastCacheForTests(): void {
  cache.clear();
}
