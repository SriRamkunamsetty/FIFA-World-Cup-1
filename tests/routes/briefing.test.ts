import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/briefing/route';
import { _resetRateLimitStoreForTests } from '@/lib/security/rateLimit';
import { buildAuthenticatedRequest } from './testHelpers';

describe('POST /api/briefing', () => {
  beforeEach(() => {
    _resetRateLimitStoreForTests();
  });

  it('rejects a request with no CSRF token with 403', async () => {
    const req = new NextRequest('http://localhost/api/briefing', { method: 'POST' });
    const response = await POST(req);
    expect(response.status).toBe(403);
  });

  it('returns a non-empty briefing string for an authenticated request', async () => {
    const { req } = await buildAuthenticatedRequest('http://localhost/api/briefing');
    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(typeof body.briefing).toBe('string');
    expect(body.briefing.length).toBeGreaterThan(0);
    expect(typeof body.generatedAt).toBe('string');
  });
});
