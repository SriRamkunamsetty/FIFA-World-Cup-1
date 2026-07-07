import type { LiveSignals } from '@/types/domain';
import { cn } from '@/lib/utils';

const TRANSIT_STATE_STYLE: Record<string, string> = {
  'on-time': 'text-turf-soft',
  delayed: 'text-floodlight-soft',
  disrupted: 'text-alert-soft',
};

export function MatchStatusBar({ signals }: { signals: LiveSignals | null }) {
  return (
    <header className="border-b border-pitch-line bg-pitch-surface">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">StadiumOps Copilot</p>
          <h1 className="mt-1 font-display text-xl font-extrabold uppercase tracking-tight text-ink sm:text-2xl">
            {signals ? `${signals.match.homeTeam} vs ${signals.match.awayTeam}` : 'Loading match…'}
          </h1>
          {signals && (
            <p className="text-sm text-ink-muted">
              {signals.match.competitionStage} · {signals.match.venue}, {signals.match.city}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm">
          {signals && <MatchStatusIndicator status={signals.match.matchStatus} />}
          {signals && (
            <div className="text-ink-muted">
              <span className="text-ink">{signals.weather.condition}</span>, {signals.weather.tempCelsius}°C
            </div>
          )}
          {signals?.transit.map((line) => (
            <div key={line.id} className="text-ink-muted">
              {line.name}:{' '}
              <span className={cn('font-semibold', TRANSIT_STATE_STYLE[line.state])}>{line.state}</span>{' '}
              <span aria-hidden="true">·</span> ETA {line.etaMinutes}m
            </div>
          ))}
        </div>
      </div>
      {signals?.weather.advisory && (
        <div
          role="status"
          className="border-t border-floodlight/30 bg-floodlight/10 px-4 py-2 text-center text-sm text-floodlight-soft sm:px-6"
        >
          {signals.weather.advisory}
        </div>
      )}
    </header>
  );
}

function MatchStatusIndicator({ status }: { status: LiveSignals['match']['matchStatus'] }) {
  const isLive = status === 'live' || status === 'half-time';
  const label = status.replace('-', ' ');

  return (
    <div className="flex items-center gap-2" role="status">
      <span
        aria-hidden="true"
        className={cn(
          'h-2.5 w-2.5 rounded-full',
          isLive ? 'animate-pulse-dot bg-alert' : 'bg-ink-faint',
        )}
      />
      <span className="font-semibold uppercase tracking-wide text-ink">{label}</span>
    </div>
  );
}
