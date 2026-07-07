import type {
  LiveSignals,
  Gate,
  DensityLevel,
  Trend,
  TransitLine,
  WeatherSnapshot,
  AccessibilityRequestItem,
  AccessibilityRequestType,
  MatchContext,
} from '@/types/domain';

/**
 * Deterministic "live" data simulator.
 *
 * A real deployment would replace this module with adapters for turnstile
 * counters, a transit operator's API, a weather service, and a guest-services
 * ticketing system. Every consumer in this app (API routes, components,
 * tests) only depends on the `LiveSignals` type, so that swap is a
 * single-file change: implement `generateLiveSignals(now)` (or an async
 * equivalent) against real sources and nothing else in the codebase moves.
 *
 * The simulation is a pure function of `now` (no `Math.random`), which makes
 * it fully reproducible in tests and demos: the same timestamp always
 * produces the same snapshot, and nearby timestamps produce smoothly
 * changing values so the UI feels "live" rather than jumpy.
 */

const CYCLE_MS = 20 * 60 * 1000; // one full demo "matchday" arc, repeating

interface GateBlueprint {
  id: string;
  label: string;
  zone: string;
  wheelchairAccessible: boolean;
  /** 0-1, relative baseline popularity of this gate. */
  baseLoad: number;
}

const GATE_BLUEPRINTS: GateBlueprint[] = [
  { id: 'gate-a', label: 'Gate A — North Plaza', zone: 'North', wheelchairAccessible: true, baseLoad: 0.75 },
  { id: 'gate-b', label: 'Gate B — South Concourse', zone: 'South', wheelchairAccessible: true, baseLoad: 0.7 },
  { id: 'gate-c', label: 'Gate C — East Riverside', zone: 'East', wheelchairAccessible: false, baseLoad: 0.55 },
  { id: 'gate-d', label: 'Gate D — West Terrace', zone: 'West', wheelchairAccessible: true, baseLoad: 0.5 },
  { id: 'gate-e', label: 'Gate E — VIP & Media', zone: 'VIP', wheelchairAccessible: true, baseLoad: 0.25 },
  { id: 'gate-f', label: 'Gate F — Accessible Entrance', zone: 'Accessible', wheelchairAccessible: true, baseLoad: 0.2 },
];

const MATCH_CONTEXT: Omit<MatchContext, 'matchStatus'> = {
  venue: 'Hard Rock Stadium',
  city: 'Miami Gardens, FL',
  homeTeam: 'Argentina',
  awayTeam: 'Japan',
  competitionStage: 'Group Stage · Match 38',
  kickoffLocal: '7:00 PM ET',
};

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp01(t);
}

/** Deterministic pseudo-random unit value in [0, 1) derived from a string seed (FNV-1a hash). */
function hashToUnit(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return ((h >>> 0) % 10_000) / 10_000;
}

function cyclePosition(nowMs: number): number {
  return (((nowMs % CYCLE_MS) + CYCLE_MS) % CYCLE_MS) / CYCLE_MS;
}

/** Overall crowd-intensity curve across one demo matchday arc, in [0, 1]. */
function baseIntensity(position: number): number {
  if (position < 0.15) return lerp(0.2, 0.9, position / 0.15); // fans arriving
  if (position < 0.18) return lerp(0.9, 0.97, (position - 0.15) / 0.03); // kickoff crush
  if (position < 0.48) return lerp(0.55, 0.3, (position - 0.18) / 0.3); // first half, gates quiet
  if (position < 0.53) return lerp(0.5, 0.82, (position - 0.48) / 0.05); // half-time concourse rush
  if (position < 0.83) return lerp(0.5, 0.25, (position - 0.53) / 0.3); // second half
  if (position < 0.9) return lerp(0.9, 0.6, (position - 0.83) / 0.07); // full-time egress surge
  return lerp(0.5, 0.15, (position - 0.9) / 0.1); // clearing out
}

function matchStatusForPosition(position: number): MatchContext['matchStatus'] {
  if (position < 0.15) return 'pre-match';
  if (position < 0.48) return 'live';
  if (position < 0.53) return 'half-time';
  if (position < 0.83) return 'live';
  return 'post-match';
}

function densityLevelFor(score: number): DensityLevel {
  if (score >= 0.85) return 'critical';
  if (score >= 0.6) return 'high';
  if (score >= 0.35) return 'moderate';
  return 'low';
}

function gateDensityScore(position: number, gate: GateBlueprint): number {
  const noise = (hashToUnit(`${gate.id}:${Math.floor(position * 400)}`) - 0.5) * 0.12;
  return clamp01(baseIntensity(position) * 0.6 + gate.baseLoad * 0.4 + noise);
}

function trendFor(nowMs: number, gate: GateBlueprint): Trend {
  const p1 = cyclePosition(nowMs);
  const p0 = cyclePosition(nowMs - 30_000); // 30 seconds ago
  const delta = gateDensityScore(p1, gate) - gateDensityScore(p0, gate);
  if (delta > 0.02) return 'rising';
  if (delta < -0.02) return 'falling';
  return 'stable';
}

function buildGates(nowMs: number): Gate[] {
  const position = cyclePosition(nowMs);
  return GATE_BLUEPRINTS.map((blueprint) => {
    const score = gateDensityScore(position, blueprint);
    return {
      id: blueprint.id,
      label: blueprint.label,
      zone: blueprint.zone,
      wheelchairAccessible: blueprint.wheelchairAccessible,
      density: densityLevelFor(score),
      waitTimeMinutes: Math.round(score * 35 + blueprint.baseLoad * 5),
      trend: trendFor(nowMs, blueprint),
      projectedInflow: Math.round(score * 600 + blueprint.baseLoad * 200),
    };
  });
}

function buildTransit(position: number): TransitLine[] {
  const isEgressSurge = position >= 0.83 && position < 0.95;
  const isKickoffWindow = position >= 0.12 && position < 0.18;

  return [
    {
      id: 'rail-blue',
      name: 'Metrorail — Orange Line',
      mode: 'rail',
      state: isEgressSurge ? 'delayed' : 'on-time',
      etaMinutes: isEgressSurge ? 14 : Math.round(4 + hashToUnit(`rail:${Math.floor(position * 200)}`) * 6),
    },
    {
      id: 'shuttle-lot-c',
      name: 'Express Shuttle — Lot C',
      mode: 'shuttle',
      state: isKickoffWindow ? 'disrupted' : 'on-time',
      etaMinutes: isKickoffWindow ? 20 : Math.round(5 + hashToUnit(`shuttle:${Math.floor(position * 200)}`) * 8),
    },
    {
      id: 'bus-42',
      name: 'Metrobus 42',
      mode: 'bus',
      state: 'on-time',
      etaMinutes: Math.round(6 + hashToUnit(`bus:${Math.floor(position * 200)}`) * 5),
    },
  ];
}

function buildWeather(nowMs: number): WeatherSnapshot {
  // Stable across a session (changes every ~6 hours) so the demo narrative
  // doesn't get distracted by weather flip-flopping every poll.
  const daySeed = Math.floor(nowMs / (6 * 60 * 60 * 1000));
  const roll = hashToUnit(`weather:${daySeed}`);
  const tempCelsius = Math.round(26 + roll * 8);

  if (roll > 0.8) {
    return {
      condition: 'Heat advisory',
      tempCelsius: tempCelsius + 3,
      advisory: 'High heat expected — recommend extra hydration stations at all gates.',
    };
  }
  if (roll > 0.6) {
    return {
      condition: 'Scattered thunderstorms',
      tempCelsius,
      advisory: 'Lightning risk pre-kickoff — brief outdoor queue lines on shelter procedure.',
    };
  }
  return { condition: 'Clear', tempCelsius, advisory: null };
}

const ACCESSIBILITY_TEMPLATES: Array<{
  type: AccessibilityRequestType;
  gateId: string;
  note: string;
  baseMinutes: number;
}> = [
  {
    type: 'wheelchair-escort',
    gateId: 'gate-c',
    note: 'Guest requesting a wheelchair escort; Gate C has no accessible path to seating.',
    baseMinutes: 18,
  },
  {
    type: 'sign-language',
    gateId: 'gate-a',
    note: 'Sign-language interpreter requested for the pre-match hospitality briefing.',
    baseMinutes: 9,
  },
  {
    type: 'visual-assistance',
    gateId: 'gate-b',
    note: 'Guest with low vision requesting a guided escort from Gate B to seating.',
    baseMinutes: 6,
  },
  {
    type: 'sensory-quiet-space',
    gateId: 'gate-d',
    note: 'Guest requesting a low-sensory quiet space away from the concourse PA speakers.',
    baseMinutes: 22,
  },
];

function buildAccessibilityRequests(nowMs: number, position: number): AccessibilityRequestItem[] {
  return ACCESSIBILITY_TEMPLATES.map((template, index) => {
    const growth = Math.floor(position * 30);
    const minutesOpen = template.baseMinutes + growth + Math.floor(hashToUnit(`${template.type}:${index}`) * 4);
    const status = minutesOpen > 30 ? 'dispatched' : minutesOpen > 45 ? 'resolved' : 'open';
    return {
      id: `acc-${index}`,
      type: template.type,
      gateId: template.gateId,
      status,
      minutesOpen,
      note: template.note,
    };
  });
}

export function generateLiveSignals(now: Date = new Date()): LiveSignals {
  const nowMs = now.getTime();
  const position = cyclePosition(nowMs);

  return {
    generatedAt: now.toISOString(),
    match: { ...MATCH_CONTEXT, matchStatus: matchStatusForPosition(position) },
    gates: buildGates(nowMs),
    transit: buildTransit(position),
    weather: buildWeather(nowMs),
    accessibilityRequests: buildAccessibilityRequests(nowMs, position),
  };
}
