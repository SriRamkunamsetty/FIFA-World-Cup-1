import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { enforceRequestGuards } from '@/lib/security/guard';
import { issueCsrfToken, CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from '@/lib/security/csrf';
import { _resetRateLimitStoreForTests } from '@/lib/security/rateLimit';

function buildRequest(options: { cookie?: string; header?: string; ip?: string } = {}): NextRequest {
  const headers = new Headers();
  if (options.header) headers.set(CSRF_HEADER_NAME, options.header);
  if (options.cookie) headers.set('cookie', `${CSRF_COOKIE_NAME}=${options.cookie}`);
  if (options.ip) headers.set('x-forwarded-for', options.ip);

  return new NextRequest('http://localhost/api/test', { method: 'POST', headers });
}

describe('enforceRequestGuards', () => {
  beforeEach(() => {
    _resetRateLimitStoreForTests();
  });

  it('rejects a request with no CSRF cookie or header with 403', () => {
    const req = buildRequest({ ip: '10.0.0.1' });
    const result = enforceRequestGuards(req, { routeKey: 'test-route-1' });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(403);
  });

  it('rejects a request where the header does not match the cookie', () => {
    const token = issueCsrfToken();
    const req = buildRequest({ cookie: token, header: 'something-else', ip: '10.0.0.2' });
    const result = enforceRequestGuards(req, { routeKey: 'test-route-2' });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(403);
  });

  it('allows a request with a valid matching CSRF cookie and header', () => {
    const token = issueCsrfToken();
    const req = buildRequest({ cookie: token, header: token, ip: '10.0.0.3' });
    const result = enforceRequestGuards(req, { routeKey: 'test-route-3' });

    expect(result.ok).toBe(true);
  });

  it('rate-limits a client after exceeding RATE_LIMIT_MAX requests on the same route', async () => {
    const { env } = await import('@/lib/env');
    const token = issueCsrfToken();
    const ip = '10.0.0.4';
    const routeKey = 'test-route-4';

    let lastResult;
    for (let i = 0; i < env.RATE_LIMIT_MAX + 1; i += 1) {
      const req = buildRequest({ cookie: token, header: token, ip });
      lastResult = enforceRequestGuards(req, { routeKey });
    }

    expect(lastResult?.ok).toBe(false);
    if (lastResult && !lastResult.ok) {
      expect(lastResult.response.status).toBe(429);
      expect(lastResult.response.headers.get('Retry-After')).toBeTruthy();
    }
  });

  it('keeps rate limits independent per route key, so a busy route cannot starve another', async () => {
    const { env } = await import('@/lib/env');
    const token = issueCsrfToken();
    const ip = '10.0.0.5';

    for (let i = 0; i < env.RATE_LIMIT_MAX + 1; i += 1) {
      enforceRequestGuards(buildRequest({ cookie: token, header: token, ip }), { routeKey: 'busy-route' });
    }

    const otherRoute = enforceRequestGuards(buildRequest({ cookie: token, header: token, ip }), {
      routeKey: 'quiet-route',
    });
    expect(otherRoute.ok).toBe(true);
  });
});
