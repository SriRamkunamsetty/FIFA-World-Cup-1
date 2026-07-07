'use client';

import { useState } from 'react';
import { Card } from './ui/Card';

interface OperationalBriefingProps {
  csrfToken: string | null;
}

export function OperationalBriefing({ csrfToken }: OperationalBriefingProps) {
  const [briefing, setBriefing] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadBriefing() {
    if (!csrfToken) {
      setError('Still setting up this session — try again in a moment.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/briefing', { method: 'POST', headers: { 'x-csrf-token': csrfToken } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not generate the briefing.');
      setBriefing(data.briefing as string);
      setGeneratedAt(data.generatedAt as string);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate the briefing.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card as="section" aria-labelledby="briefing-heading" className="border-floodlight/30">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2
            id="briefing-heading"
            className="font-display text-lg font-extrabold uppercase tracking-tight text-ink"
          >
            Operational Intelligence Briefing
          </h2>
          <p className="mt-1 text-xs text-ink-muted">
            One AI-synthesized situation report — crowd status, transit, weather, and accessibility, in one
            read.
          </p>
        </div>
        <button
          type="button"
          onClick={loadBriefing}
          disabled={isLoading}
          className="shrink-0 rounded-md bg-floodlight px-4 py-2 text-sm font-semibold text-pitch-bg disabled:opacity-50"
        >
          {isLoading ? 'Synthesizing…' : briefing ? 'Refresh briefing' : 'Generate situation briefing'}
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm text-alert-soft">
          {error}
        </p>
      )}

      <div aria-live="polite" className="mt-3">
        {briefing && (
          <div className="rounded-md bg-pitch-raised p-3">
            <p className="text-sm leading-relaxed text-ink">{briefing}</p>
            {generatedAt && (
              <p className="mt-2 text-xs text-ink-muted">
                Generated{' '}
                {new Date(generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
