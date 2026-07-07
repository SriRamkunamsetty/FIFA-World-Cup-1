import { describe, it, expect, beforeEach } from 'vitest';
import {
  cacheKeyFor,
  getCachedBroadcast,
  setCachedBroadcast,
  _resetBroadcastCacheForTests,
} from '@/lib/cache/broadcastCache';

describe('broadcastCache', () => {
  beforeEach(() => {
    _resetBroadcastCacheForTests();
  });

  it('produces the same key regardless of language order', () => {
    const keyA = cacheKeyFor('Gate B closing', ['en', 'es']);
    const keyB = cacheKeyFor('Gate B closing', ['es', 'en']);
    expect(keyA).toBe(keyB);
  });

  it('produces a different key for a different message', () => {
    const keyA = cacheKeyFor('Gate B closing', ['en']);
    const keyB = cacheKeyFor('Gate C closing', ['en']);
    expect(keyA).not.toBe(keyB);
  });

  it('returns null for a key that was never set', () => {
    expect(getCachedBroadcast('nonexistent')).toBeNull();
  });

  it('returns the stored value before it expires', () => {
    const key = cacheKeyFor('Gate B closing', ['en']);
    const value = { translations: [{ language: 'en' as const, text: 'Gate B closing' }], plainLanguageVersion: 'Gate B closing.' };
    setCachedBroadcast(key, value, 1_000);
    expect(getCachedBroadcast(key, 1_000 + 60_000)).toEqual(value);
  });

  it('expires entries after the TTL', () => {
    const key = cacheKeyFor('Gate B closing', ['en']);
    const value = { translations: [{ language: 'en' as const, text: 'Gate B closing' }], plainLanguageVersion: 'Gate B closing.' };
    setCachedBroadcast(key, value, 1_000);
    expect(getCachedBroadcast(key, 1_000 + 6 * 60 * 1000)).toBeNull(); // TTL is 5 minutes
  });
});
