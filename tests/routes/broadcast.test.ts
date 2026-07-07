import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/broadcast/route';
import { _resetRateLimitStoreForTests } from '@/lib/security/rateLimit';
import { _resetBroadcastCacheForTests } from '@/lib/cache/broadcastCache';
import { buildAuthenticatedRequest } from './testHelpers';

describe('POST /api/broadcast', () => {
  beforeEach(() => {
    _resetRateLimitStoreForTests();
    _resetBroadcastCacheForTests();
  });

  it('rejects a request with no CSRF token with 403', async () => {
    const req = new NextRequest('http://localhost/api/broadcast', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: 'Gate B closing.', languages: ['en'] }),
    });
    const response = await POST(req);
    expect(response.status).toBe(403);
  });

  it('rejects an unsupported language code with 400', async () => {
    const { req } = await buildAuthenticatedRequest('http://localhost/api/broadcast', {
      message: 'Gate B closing.',
      languages: ['de'],
    });
    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it('translates a valid broadcast and reports it as not cached on first call', async () => {
    const { req } = await buildAuthenticatedRequest('http://localhost/api/broadcast', {
      message: 'Gate B closing soon.',
      languages: ['en', 'es'],
    });
    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.translations).toHaveLength(2);
    expect(body.cached).toBe(false);
  });
});
