import { describe, it, expect, beforeEach } from 'vitest';
import { checkRateLimit, getClientKey, _resetRateLimitStoreForTests } from '@/lib/security/rateLimit';

describe('checkRateLimit', () => {
  beforeEach(() => {
    _resetRateLimitStoreForTests();
  });

  it('allows requests up to the max within a window', () => {
    const now = 1_000_000;
    const first = checkRateLimit('client-a', 3, 60_000, now);
    const second = checkRateLimit('client-a', 3, 60_000, now + 10);
    const third = checkRateLimit('client-a', 3, 60_000, now + 20);

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(third.allowed).toBe(true);
    expect(third.remaining).toBe(0);
  });

  it('blocks the request once the max is exceeded within the window', () => {
    const now = 1_000_000;
    checkRateLimit('client-b', 2, 60_000, now);
    checkRateLimit('client-b', 2, 60_000, now + 10);
    const blocked = checkRateLimit('client-b', 2, 60_000, now + 20);

    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });

  it('resets the count once the window has elapsed', () => {
    const now = 1_000_000;
    checkRateLimit('client-c', 1, 1_000, now);
    const blocked = checkRateLimit('client-c', 1, 1_000, now + 500);
    const allowedAfterWindow = checkRateLimit('client-c', 1, 1_000, now + 1_500);

    expect(blocked.allowed).toBe(false);
    expect(allowedAfterWindow.allowed).toBe(true);
  });

  it('tracks separate keys independently', () => {
    const now = 1_000_000;
    checkRateLimit('client-d', 1, 60_000, now);
    const otherClient = checkRateLimit('client-e', 1, 60_000, now);

    expect(otherClient.allowed).toBe(true);
  });
});

describe('getClientKey', () => {
  it('reads the first address from x-forwarded-for', () => {
    const headers = new Headers({ 'x-forwarded-for': '203.0.113.5, 70.41.3.18' });
    expect(getClientKey(headers)).toBe('203.0.113.5');
  });

  it('falls back to "unknown" when the header is absent', () => {
    expect(getClientKey(new Headers())).toBe('unknown');
  });
});
