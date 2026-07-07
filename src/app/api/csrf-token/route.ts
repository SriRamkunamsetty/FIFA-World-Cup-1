import { NextResponse } from 'next/server';
import { issueCsrfToken, CSRF_COOKIE_NAME } from '@/lib/security/csrf';
import { env } from '@/lib/env';

export const runtime = 'nodejs'; // needs node:crypto

/**
 * Issues a fresh CSRF token: sets it as an httpOnly cookie (so client-side
 * XSS can't read it directly) and also returns it in the JSON body, which
 * the dashboard stores in memory and echoes back as the `x-csrf-token`
 * header on every mutating/AI-cost-incurring request.
 */
export async function GET() {
  const token = issueCsrfToken();

  const response = NextResponse.json({ token });
  response.cookies.set(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 2, // 2 hours, matches token TTL
  });
  return response;
}
