import { describe, it, expect } from 'vitest';
import { generateLiveSignals } from '@/lib/simulation/liveSignals';

describe('generateLiveSignals', () => {
  it('is a deterministic pure function of the given timestamp', () => {
    const now = new Date('2026-06-15T19:03:00.000Z');
    const first = generateLiveSignals(now);
    const second = generateLiveSignals(now);

    expect(second).toEqual(first);
  });

  it('produces gates with values in valid ranges', () => {
    const signals = generateLiveSignals(new Date('2026-06-15T19:00:00.000Z'));

    expect(signals.gates.length).toBeGreaterThan(0);
    for (const gate of signals.gates) {
      expect(['low', 'moderate', 'high', 'critical']).toContain(gate.density);
      expect(gate.waitTimeMinutes).toBeGreaterThanOrEqual(0);
      expect(gate.projectedInflow).toBeGreaterThanOrEqual(0);
      expect(['rising', 'falling', 'stable']).toContain(gate.trend);
    }
  });

  it('flags Gate C as lacking a wheelchair-accessible path', () => {
    const signals = generateLiveSignals(new Date('2026-06-15T19:00:00.000Z'));
    const gateC = signals.gates.find((g) => g.id === 'gate-c');

    expect(gateC).toBeDefined();
    expect(gateC?.wheelchairAccessible).toBe(false);
  });

  it('reflects match status across the demo cycle', () => {
    const cycleStart = new Date('2026-06-15T19:00:00.000Z').getTime();
    const preMatch = generateLiveSignals(new Date(cycleStart)); // position 0.00
    const firstHalf = generateLiveSignals(new Date(cycleStart + 6 * 60 * 1000)); // position 0.30
    const halfTime = generateLiveSignals(new Date(cycleStart + 10 * 60 * 1000)); // position 0.50
    const postMatch = generateLiveSignals(new Date(cycleStart + 19 * 60 * 1000)); // position 0.95

    expect(preMatch.match.matchStatus).toBe('pre-match');
    expect(firstHalf.match.matchStatus).toBe('live');
    expect(halfTime.match.matchStatus).toBe('half-time');
    expect(postMatch.match.matchStatus).toBe('post-match');
  });

  it('always returns at least one accessibility request for the demo scenario', () => {
    const signals = generateLiveSignals(new Date('2026-06-15T19:00:00.000Z'));
    expect(signals.accessibilityRequests.length).toBeGreaterThan(0);
    for (const request of signals.accessibilityRequests) {
      expect(request.minutesOpen).toBeGreaterThanOrEqual(0);
    }
  });
});
