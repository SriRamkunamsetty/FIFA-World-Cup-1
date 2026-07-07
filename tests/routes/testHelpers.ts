import { NextRequest } from 'next/server';
import { GET as getCsrfToken } from '@/app/api/csrf-token/route';
import { CSRF_COOKIE_NAME } from '@/lib/security/csrf';

/**
 * Issues a real CSRF token via the actual route handler, then builds a
 * NextRequest that presents it as both cookie and header — i.e. a request
 * that `enforceRequestGuards` will accept, the same way a real browser
 * request from this app would.
 */
export async function buildAuthenticatedRequest(
  url: string,
  body?: unknown,
): Promise<{ req: NextRequest; token: string }> {
  const tokenResponse = await getCsrfToken();
  const { token } = (await tokenResponse.json()) as { token: string };

  const headers = new Headers({ 'x-csrf-token': token, cookie: `${CSRF_COOKIE_NAME}=${token}` });
  if (body !== undefined) headers.set('content-type', 'application/json');

  const req = new NextRequest(url, {
    method: 'POST',
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return { req, token };
}
