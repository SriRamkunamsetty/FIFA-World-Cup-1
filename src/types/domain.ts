/**
 * Domain model for StadiumOps Copilot.
 *
 * These types are the single source of truth for the shape of "live"
 * operational data. In this prototype the data comes from a deterministic
 * simulator (see `lib/simulation/liveSignals.ts`), but every consumer only
 * depends on these interfaces, so swapping the simulator for a real
 * turnstile feed, transit API, or CCTV crowd-counting service later does
 * not require touching any UI or AI code.
 */

export type DensityLevel = 'low' | 'moderate' | 'high' | 'critical';

export type Trend = 'rising' | 'falling' | 'stable';

export interface Gate {
  id: string;
  label: string;
  zone: string;
  wheelchairAccessible: boolean;
  density: DensityLevel;
  waitTimeMinutes: number;
  trend: Trend;
  /** People estimated to pass through this gate in the next 10 minutes. */
  projectedInflow: number;
}

export type TransitState = 'on-time' | 'delayed' | 'disrupted';

export interface TransitLine {
  id: string;
  name: string;
  mode: 'rail' | 'bus' | 'shuttle';
  state: TransitState;
  etaMinutes: number;
}

export interface WeatherSnapshot {
  condition: string;
  tempCelsius: number;
  advisory: string | null;
}

export type AccessibilityRequestType =
  | 'wheelchair-escort'
  | 'sign-language'
  | 'visual-assistance'
  | 'medical'
  | 'sensory-quiet-space';

export type AccessibilityRequestStatus = 'open' | 'dispatched' | 'resolved';

export interface AccessibilityRequestItem {
  id: string;
  type: AccessibilityRequestType;
  gateId: string;
  status: AccessibilityRequestStatus;
  minutesOpen: number;
  note: string;
}

export interface MatchContext {
  venue: string;
  city: string;
  homeTeam: string;
  awayTeam: string;
  competitionStage: string;
  kickoffLocal: string;
  matchStatus: 'pre-match' | 'live' | 'half-time' | 'post-match';
}

export interface LiveSignals {
  generatedAt: string;
  match: MatchContext;
  gates: Gate[];
  transit: TransitLine[];
  weather: WeatherSnapshot;
  accessibilityRequests: AccessibilityRequestItem[];
}

/** Languages the broadcast composer can translate organizer messages into. */
export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'ar', label: 'Arabic' },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code'];

export interface BroadcastTranslation {
  language: LanguageCode;
  text: string;
}

export interface BroadcastResult {
  original: string;
  translations: BroadcastTranslation[];
  /** A short, literal, screen-reader-friendly rewrite for accessible playback. */
  plainLanguageVersion: string;
  cached: boolean;
}

export interface DecisionAssistantMessage {
  role: 'user' | 'assistant';
  content: string;
}
