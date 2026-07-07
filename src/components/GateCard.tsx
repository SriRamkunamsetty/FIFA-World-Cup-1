import type { Gate } from '@/types/domain';
import { DensityBadge } from './ui/Badge';
import { Card } from './ui/Card';

const TREND_ARROW: Record<Gate['trend'], string> = {
  rising: '↑',
  falling: '↓',
  stable: '→',
};

const TREND_LABEL: Record<Gate['trend'], string> = {
  rising: 'rising',
  falling: 'falling',
  stable: 'holding steady',
};

export function GateCard({ gate }: { gate: Gate }) {
  return (
    <Card as="section" aria-labelledby={`${gate.id}-heading`} className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <h3
          id={`${gate.id}-heading`}
          className="font-display text-sm font-bold uppercase tracking-wide text-ink"
        >
          {gate.label}
        </h3>
        {gate.wheelchairAccessible ? (
          <span
            className="shrink-0 rounded-sm border border-pitch-line px-1.5 py-0.5 text-[10px] font-semibold uppercase text-ink-muted"
            title="Wheelchair-accessible entrance"
          >
            <span aria-hidden="true">♿</span>
            <span className="sr-only"> Wheelchair-accessible entrance</span>
          </span>
        ) : (
          <span
            className="shrink-0 rounded-sm border border-alert/40 bg-alert/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-alert-soft"
            title="No wheelchair-accessible path"
          >
            No accessible path
          </span>
        )}
      </div>

      <DensityBadge level={gate.density} />

      <dl className="mt-1 grid grid-cols-2 gap-x-2 gap-y-1 text-sm">
        <dt className="text-ink-muted">Wait time</dt>
        <dd className="text-right font-mono text-ink">{gate.waitTimeMinutes} min</dd>
        <dt className="text-ink-muted">Trend</dt>
        <dd className="text-right text-ink">
          <span aria-hidden="true">{TREND_ARROW[gate.trend]}</span>{' '}
          <span className="sr-only">{TREND_LABEL[gate.trend]}</span>
          <span aria-hidden="true" className="text-ink-muted">
            {' '}
            {TREND_LABEL[gate.trend]}
          </span>
        </dd>
        <dt className="text-ink-muted">Projected inflow</dt>
        <dd className="text-right font-mono text-ink">{gate.projectedInflow}/10min</dd>
      </dl>
    </Card>
  );
}
