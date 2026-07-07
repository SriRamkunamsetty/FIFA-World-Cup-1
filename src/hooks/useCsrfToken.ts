'use client';

import { useEffect, useState } from 'react';

/**
 * Fetches a CSRF token once on mount and keeps it in memory (never
 * localStorage/sessionStorage). Every mutating fetch call in this app reads
 * this value and sends it as the `x-csrf-token` header.
 */
export function useCsrfToken(): string | null {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/csrf-token')
      .then((res) => res.json())
      .then((data: { token?: string }) => {
        if (!cancelled && data.token) setToken(data.token);
      })
      .catch(() => {
        // Non-fatal: mutating requests will fail with a clear 403 and the
        // user can retry, rather than the whole dashboard crashing.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return token;
}
