import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { env } from '@/lib/env';

/**
 * CSRF protection via a signed double-submit cookie:
 *
 * 1. `GET /api/csrf-token` issues a random token, signs it with a server
 *    secret, and sets it as a readable (non-httpOnly) cookie.
 * 2. The client echoes that token back in an `x-csrf-token` header on every
 *    state-changing request.
 * 3. The server checks that the header matches the cookie AND that the
 *    cookie's signature is valid and not expired.
 *
 * A cross-origin attacker's page cannot read our cookie (browsers enforce
 * same-origin for cookie access via JS, and we don't set SameSite=None), so
 * it cannot forge a matching header value — this is what stops the forged
 * request even though cookies themselves are sent automatically by the
 * browser on same-site navigations.
 */

const TOKEN_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours
export const CSRF_COOKIE_NAME = 'stadiumops_csrf';
export const CSRF_HEADER_NAME = 'x-csrf-token';

function sign(payload: string): string {
  return createHmac('sha256', env.CSRF_SECRET).update(payload).digest('hex');
}

export function issueCsrfToken(): string {
  const nonce = randomBytes(16).toString('hex');
  const issuedAt = Date.now().toString();
  const payload = `${nonce}.${issuedAt}`;
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

export function isCsrfTokenValid(token: string | undefined | null): boolean {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;

  const [nonce, issuedAt, signature] = parts;
  const payload = `${nonce}.${issuedAt}`;
  const expected = sign(payload);

  const signatureBuffer = Buffer.from(signature ?? '', 'hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  if (signatureBuffer.length !== expectedBuffer.length) return false;
  if (!timingSafeEqual(signatureBuffer, expectedBuffer)) return false;

  const age = Date.now() - Number(issuedAt);
  if (!Number.isFinite(age) || age < 0 || age > TOKEN_TTL_MS) return false;

  return true;
}

/**
 * Verifies a request for the double-submit pattern: header must be present,
 * cryptographically valid, and match the cookie exactly.
 */
export function verifyCsrf(cookieToken: string | undefined, headerToken: string | undefined | null): boolean {
  if (!cookieToken || !headerToken) return false;
  if (cookieToken !== headerToken) return false;
  return isCsrfTokenValid(cookieToken);
}
