import { cn } from '@/lib/utils';
import type { DensityLevel } from '@/types/domain';

const DENSITY_STYLES: Record<DensityLevel, string> = {
  low: 'bg-turf/20 text-turf-soft border-turf/40',
  moderate: 'bg-floodlight/20 text-floodlight-soft border-floodlight/40',
  high: 'bg-alert/20 text-alert-soft border-alert/40',
  critical: 'bg-alert text-pitch-bg border-alert',
};

const DENSITY_LABEL: Record<DensityLevel, string> = {
  low: 'Low density',
  moderate: 'Moderate density',
  high: 'High density',
  critical: 'Critical density',
};

export function DensityBadge({ level }: { level: DensityLevel }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-sm border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide',
        DENSITY_STYLES[level],
      )}
    >
      {DENSITY_LABEL[level]}
    </span>
  );
}

const PRIORITY_STYLES: Record<'low' | 'medium' | 'high', string> = {
  low: 'bg-turf/20 text-turf-soft border-turf/40',
  medium: 'bg-floodlight/20 text-floodlight-soft border-floodlight/40',
  high: 'bg-alert text-pitch-bg border-alert',
};

export function PriorityBadge({ level }: { level: 'low' | 'medium' | 'high' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-sm border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide',
        PRIORITY_STYLES[level],
      )}
    >
      {level} priority
    </span>
  );
}
