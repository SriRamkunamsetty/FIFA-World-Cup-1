'use client';

import { useLiveSignals } from '@/hooks/useLiveSignals';
import { useCsrfToken } from '@/hooks/useCsrfToken';
import { MatchStatusBar } from './MatchStatusBar';
import { GateStatusGrid } from './GateStatusGrid';
import { DecisionAssistantPanel } from './DecisionAssistantPanel';
import { BroadcastComposer } from './BroadcastComposer';
import { AccessibilityInsights } from './AccessibilityInsights';

export function Dashboard() {
  const { signals, error } = useLiveSignals();
  const csrfToken = useCsrfToken();

  return (
    <div className="min-h-screen bg-pitch-bg">
      <MatchStatusBar signals={signals} />

      <main id="main-content" className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {error && (
          <p role="alert" className="mb-4 rounded-md border border-alert/40 bg-alert/10 px-3 py-2 text-sm text-alert-soft">
            {error}
          </p>
        )}

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <GateStatusGrid signals={signals} />
          </div>
          <div className="xl:col-span-1">
            <DecisionAssistantPanel csrfToken={csrfToken} />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <BroadcastComposer csrfToken={csrfToken} />
          <AccessibilityInsights csrfToken={csrfToken} />
        </div>

        <footer className="mt-8 border-t border-pitch-line pt-4 text-xs text-ink-faint">
          StadiumOps Copilot is an unofficial hackathon prototype built for Google PromptWars. It is not affiliated
          with or endorsed by FIFA. Match, gate, and crowd data on this screen are simulated for demonstration.
        </footer>
      </main>
    </div>
  );
}
