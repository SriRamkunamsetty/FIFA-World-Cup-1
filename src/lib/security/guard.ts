import { NextResponse, type NextRequest } from 'next/server';
import { checkRateLimit, getClientKey } from './rateLimit';
import { verifyCsrf, CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from './csrf';
import { env } from '@/lib/env';

interface GuardOptions {
  /** Distinguishes rate-limit buckets per route so one busy endpoint can't starve another. */
  routeKey: string;
}

type GuardResult = { ok: true } | { ok: false; response: NextResponse };

/**
 * Every route in this app that costs money (calls the AI provider) or
 * changes state runs through this single guard, in this order:
 *
 * 1. Rate limit (per client IP, per route) — protects API quota/cost.
 * 2. CSRF (signed double-submit cookie vs header) — protects against
 *    forged cross-site requests riding the organizer's session cookie.
 *
 * Centralizing this in one function means there is exactly one place to
 * audit or change the security model, instead of three near-duplicate
 * copies drifting apart across route handlers.
 *
 * Note: `/api/accessibility-insights` is a GET in REST terms but is guarded
 * here too, because it triggers a paid AI call — for this app "costs money"
 * matters as much as "changes state" when deciding what needs CSRF.
 */
export function enforceRequestGuards(req: NextRequest, { routeKey }: GuardOptions): GuardResult {
  const clientKey = getClientKey(req.headers);
  const rateLimitKey = `${routeKey}:${clientKey}`;
  const rateLimit = checkRateLimit(rateLimitKey, env.RATE_LIMIT_MAX, env.RATE_LIMIT_WINDOW_MS);

  if (!rateLimit.allowed) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Too many requests. Please slow down.' },
        { status: 429, headers: { 'Retry-After': Math.ceil(rateLimit.retryAfterMs / 1000).toString() } },
      ),
    };
  }

  const cookieToken = req.cookies.get(CSRF_COOKIE_NAME)?.value;
  const headerToken = req.headers.get(CSRF_HEADER_NAME);

  if (!verifyCsrf(cookieToken, headerToken)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Missing or invalid CSRF token. Reload the page and try again.' },
        { status: 403 },
      ),
    };
  }

  return { ok: true };
}
