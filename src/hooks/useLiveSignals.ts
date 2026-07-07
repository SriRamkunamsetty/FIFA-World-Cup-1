'use client';

import { useEffect, useRef, useState } from 'react';
import type { LiveSignals } from '@/types/domain';

const POLL_INTERVAL_MS = 8000;

interface UseLiveSignalsResult {
  signals: LiveSignals | null;
  error: string | null;
  isLoading: boolean;
}

/**
 * Polls `/api/live-signals` on an interval. Kept deliberately infrequent
 * (8s) — this is operational context, not a stock ticker, and a shorter
 * interval would just burn resources without giving the organizer any more
 * useful information.
 */
export function useLiveSignals(): UseLiveSignalsResult {
  const [signals, setSignals] = useState<LiveSignals | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchSignals() {
      try {
        const res = await fetch('/api/live-signals', { cache: 'no-store' });
        if (!res.ok) throw new Error(`Request failed with ${res.status}`);
        const data = (await res.json()) as LiveSignals;
        if (!cancelled) {
          setSignals(data);
          setError(null);
        }
      } catch {
        if (!cancelled) setError('Live data is temporarily unavailable.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchSignals();
    intervalRef.current = setInterval(fetchSignals, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return { signals, error, isLoading };
}
