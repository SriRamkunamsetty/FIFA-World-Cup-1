'use client';

import { useState } from 'react';
import { Card } from './ui/Card';
import { PriorityBadge } from './ui/Badge';
import type { AccessibilityRequestItem } from '@/types/domain';
import type { AccessibilityInsight } from '@/lib/services/accessibilityInsightsService';

const TYPE_LABEL: Record<AccessibilityRequestItem['type'], string> = {
  'wheelchair-escort': 'Wheelchair escort',
  'sign-language': 'Sign-language interpreter',
  'visual-assistance': 'Visual assistance',
  medical: 'Medical (non-emergency)',
  'sensory-quiet-space': 'Sensory quiet space',
};

interface AccessibilityInsightsProps {
  csrfToken: string | null;
}

export function AccessibilityInsights({ csrfToken }: AccessibilityInsightsProps) {
  const [insights, setInsights] = useState<AccessibilityInsight[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Client-side only: this is a hackathon prototype with no persistence
  // layer, so "dispatched" is tracked locally rather than written back to a
  // real guest-services system. A production deployment would call a
  // dispatch API here instead of updating local state.
  const [dispatchedIds, setDispatchedIds] = useState<Set<string>>(new Set());

  async function loadInsights() {
    if (!csrfToken) {
      setError('Still setting up this session — try again in a moment.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/accessibility-insights', {
        method: 'POST',
        headers: { 'x-csrf-token': csrfToken },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not load accessibility insights.');
      setInsights(data.insights as AccessibilityInsight[]);
      setDispatchedIds(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load accessibility insights.');
    } finally {
      setIsLoading(false);
    }
  }

  function markDispatched(id: string) {
    setDispatchedIds((prev) => new Set(prev).add(id));
  }

  return (
    <Card as="section" aria-labelledby="accessibility-heading">
      <div className="flex items-center justify-between gap-2">
        <h2
          id="accessibility-heading"
          className="font-display text-lg font-extrabold uppercase tracking-tight text-ink"
        >
          Accessibility Insights
        </h2>
        <button
          type="button"
          onClick={loadInsights}
          disabled={isLoading}
          className="rounded-md border border-pitch-line px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-ink hover:border-floodlight disabled:opacity-50"
        >
          {isLoading ? 'Prioritizing…' : insights ? 'Refresh' : 'Get prioritized actions'}
        </button>
      </div>
      <p className="mt-1 text-xs text-ink-muted">
        Open wheelchair, sign-language, visual-assistance, and sensory requests, ranked by urgency.
      </p>

      {error && (
        <p role="alert" className="mt-2 text-sm text-alert-soft">
          {error}
        </p>
      )}

      <ul className="mt-3 space-y-2" aria-live="polite">
        {insights?.map((insight) => {
          const isDispatched = dispatchedIds.has(insight.id);
          return (
            <li
              key={insight.id}
              className={`rounded-md border p-3 ${isDispatched ? 'border-turf/40 bg-turf/10' : 'border-pitch-line bg-pitch-raised'}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-semibold text-ink">{TYPE_LABEL[insight.type]}</span>
                <PriorityBadge level={insight.priority} />
              </div>
              <p className="mt-1 text-xs text-ink-muted">
                {insight.gateId} · open {insight.minutesOpen} min · status: {insight.status}
              </p>
              <p className="mt-1 text-sm text-ink">{insight.recommendedAction}</p>
              <div className="mt-2">
                {isDispatched ? (
                  <span className="text-xs font-semibold text-turf-soft">✓ Marked as dispatched</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => markDispatched(insight.id)}
                    className="rounded-sm border border-pitch-line px-2 py-1 text-xs font-semibold text-ink hover:border-turf hover:text-turf-soft"
                  >
                    Mark as dispatched
                  </button>
                )}
              </div>
            </li>
          );
        })}
        {insights?.length === 0 && (
          <p className="text-sm text-ink-muted">No open accessibility requests right now.</p>
        )}
      </ul>
    </Card>
  );
}
