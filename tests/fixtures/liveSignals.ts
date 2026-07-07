import type { LiveSignals } from '@/types/domain';

export function buildLiveSignalsFixture(overrides: Partial<LiveSignals> = {}): LiveSignals {
  return {
    generatedAt: '2026-06-15T19:00:00.000Z',
    match: {
      venue: 'Hard Rock Stadium',
      city: 'Miami Gardens, FL',
      homeTeam: 'Argentina',
      awayTeam: 'Japan',
      competitionStage: 'Group Stage · Match 38',
      kickoffLocal: '7:00 PM ET',
      matchStatus: 'live',
    },
    gates: [
      {
        id: 'gate-a',
        label: 'Gate A — North Plaza',
        zone: 'North',
        wheelchairAccessible: true,
        density: 'high',
        waitTimeMinutes: 22,
        trend: 'rising',
        projectedInflow: 420,
      },
      {
        id: 'gate-c',
        label: 'Gate C — East Riverside',
        zone: 'East',
        wheelchairAccessible: false,
        density: 'moderate',
        waitTimeMinutes: 10,
        trend: 'stable',
        projectedInflow: 180,
      },
    ],
    transit: [{ id: 'rail-blue', name: 'Metrorail — Orange Line', mode: 'rail', state: 'on-time', etaMinutes: 6 }],
    weather: { condition: 'Clear', tempCelsius: 29, advisory: null },
    accessibilityRequests: [
      {
        id: 'acc-0',
        type: 'wheelchair-escort',
        gateId: 'gate-c',
        status: 'open',
        minutesOpen: 18,
        note: 'Guest requesting a wheelchair escort; Gate C has no accessible path to seating.',
      },
    ],
    ...overrides,
  };
}
