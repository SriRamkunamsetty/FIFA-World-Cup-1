import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/decision-assistant/route';
import { _resetRateLimitStoreForTests } from '@/lib/security/rateLimit';
import { buildAuthenticatedRequest } from './testHelpers';

describe('POST /api/decision-assistant', () => {
  beforeEach(() => {
    _resetRateLimitStoreForTests();
  });

  it('rejects a request with no CSRF token with 403', async () => {
    const req = new NextRequest('http://localhost/api/decision-assistant', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: 'hi' }),
    });

    const response = await POST(req);
    expect(response.status).toBe(403);
  });

  it('rejects an empty message with 400, after passing CSRF', async () => {
    const { req } = await buildAuthenticatedRequest('http://localhost/api/decision-assistant', {
      message: '',
    });
    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it('streams a grounded reply for a valid, authenticated request', async () => {
    const { req } = await buildAuthenticatedRequest('http://localhost/api/decision-assistant', {
      message: 'What should I do about the busiest gate?',
    });

    const response = await POST(req);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/plain');

    const text = await response.text();
    expect(text.length).toBeGreaterThan(0);
  });
});
