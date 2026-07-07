import { describe, it, expect, vi, afterEach } from 'vitest';
import { issueCsrfToken, isCsrfTokenValid, verifyCsrf } from '@/lib/security/csrf';

describe('CSRF token', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('issues a token with the expected nonce.timestamp.signature shape', () => {
    const token = issueCsrfToken();
    expect(token.split('.')).toHaveLength(3);
  });

  it('validates a freshly issued token', () => {
    const token = issueCsrfToken();
    expect(isCsrfTokenValid(token)).toBe(true);
  });

  it('rejects a token with a tampered signature', () => {
    const token = issueCsrfToken();
    const parts = token.split('.');
    const tampered = `${parts[0]}.${parts[1]}.${'0'.repeat(parts[2]!.length)}`;
    expect(isCsrfTokenValid(tampered)).toBe(false);
  });

  it('rejects a malformed token', () => {
    expect(isCsrfTokenValid('not-a-real-token')).toBe(false);
    expect(isCsrfTokenValid(null)).toBe(false);
    expect(isCsrfTokenValid(undefined)).toBe(false);
  });

  it('rejects a token older than the TTL', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    const token = issueCsrfToken();

    vi.setSystemTime(new Date('2026-01-01T03:00:00.000Z')); // 3 hours later, TTL is 2 hours
    expect(isCsrfTokenValid(token)).toBe(false);
  });

  it('verifyCsrf requires the header to match the cookie exactly', () => {
    const token = issueCsrfToken();
    const otherToken = issueCsrfToken();

    expect(verifyCsrf(token, token)).toBe(true);
    expect(verifyCsrf(token, otherToken)).toBe(false);
    expect(verifyCsrf(token, undefined)).toBe(false);
    expect(verifyCsrf(undefined, token)).toBe(false);
  });
});
