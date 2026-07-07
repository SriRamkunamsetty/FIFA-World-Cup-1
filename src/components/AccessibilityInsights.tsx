'use client';

import { useState } from 'react';
import { Card } from './ui/Card';
import { PriorityBadge } from './ui/Badge';
import type { AccessibilityRequestItem } from '@/types/domain';

type Insight = AccessibilityRequestItem & {
  priority: 'low' | 'medium' | 'high';
  recommendedAction: string;
};

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
  const [insights, setInsights] = useState<Insight[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setInsights(data.insights as Insight[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load accessibility insights.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card as="section" aria-labelledby="accessibility-heading">
      <div className="flex items-center justify-between gap-2">
        <h2 id="accessibility-heading" className="font-display text-lg font-extrabold uppercase tracking-tight text-ink">
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
        {insights?.map((insight) => (
          <li key={insight.id} className="rounded-md border border-pitch-line bg-pitch-raised p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold text-ink">{TYPE_LABEL[insight.type]}</span>
              <PriorityBadge level={insight.priority} />
            </div>
            <p className="mt-1 text-xs text-ink-muted">
              {insight.gateId} · open {insight.minutesOpen} min · status: {insight.status}
            </p>
            <p className="mt-1 text-sm text-ink">{insight.recommendedAction}</p>
          </li>
        ))}
        {insights?.length === 0 && <p className="text-sm text-ink-muted">No open accessibility requests right now.</p>}
      </ul>
    </Card>
  );
}
