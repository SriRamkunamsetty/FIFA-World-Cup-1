import type { LiveSignals } from '@/types/domain';
import { GateCard } from './GateCard';

export function GateStatusGrid({ signals }: { signals: LiveSignals | null }) {
  return (
    <section aria-labelledby="gate-status-heading" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h2 id="gate-status-heading" className="font-display text-lg font-extrabold uppercase tracking-tight text-ink">
          Gate &amp; Crowd Status
        </h2>
        {signals && (
          <p className="text-xs text-ink-muted">
            Updated {new Date(signals.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>

      {!signals ? (
        <p className="text-sm text-ink-muted" role="status">
          Loading gate status…
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {signals.gates.map((gate) => (
            <GateCard key={gate.id} gate={gate} />
          ))}
        </div>
      )}
    </section>
  );
}
