import { describe, it, expect } from 'vitest';
import { GET as getCsrfToken } from '@/app/api/csrf-token/route';
import { GET as getLiveSignals } from '@/app/api/live-signals/route';
import { CSRF_COOKIE_NAME } from '@/lib/security/csrf';

describe('GET /api/csrf-token', () => {
  it('returns a token in the body and sets it as an httpOnly cookie', async () => {
    const response = await getCsrfToken();
    const body = (await response.json()) as { token: string };

    expect(body.token.split('.')).toHaveLength(3);

    const setCookie = response.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain(CSRF_COOKIE_NAME);
    expect(setCookie.toLowerCase()).toContain('httponly');
  });
});

describe('GET /api/live-signals', () => {
  it('returns a live-signals snapshot with the expected top-level shape', async () => {
    const response = await getLiveSignals();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toHaveProperty('match');
    expect(body).toHaveProperty('gates');
    expect(body).toHaveProperty('transit');
    expect(body).toHaveProperty('weather');
    expect(body).toHaveProperty('accessibilityRequests');
    expect(Array.isArray(body.gates)).toBe(true);
  });
});
