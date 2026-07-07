import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/accessibility-insights/route';
import { _resetRateLimitStoreForTests } from '@/lib/security/rateLimit';
import { buildAuthenticatedRequest } from './testHelpers';

describe('POST /api/accessibility-insights', () => {
  beforeEach(() => {
    _resetRateLimitStoreForTests();
  });

  it('rejects a request with no CSRF token with 403', async () => {
    const req = new NextRequest('http://localhost/api/accessibility-insights', { method: 'POST' });
    const response = await POST(req);
    expect(response.status).toBe(403);
  });

  it('returns prioritized insights for an authenticated request', async () => {
    const { req } = await buildAuthenticatedRequest('http://localhost/api/accessibility-insights');
    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(body.insights)).toBe(true);
    expect(body.insights.length).toBeGreaterThan(0);
    for (const insight of body.insights) {
      expect(['low', 'medium', 'high']).toContain(insight.priority);
    }
  });
});
