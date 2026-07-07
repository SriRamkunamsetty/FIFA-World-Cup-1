import type { DecisionAssistantMessage, LiveSignals, AccessibilityRequestItem, LanguageCode } from '@/types/domain';

/**
 * Every AI-backed feature in the app talks to this interface, never to a
 * concrete SDK client directly. That means:
 *  - Route handlers, and their tests, depend on an abstraction, not a
 *    vendor SDK (dependency inversion).
 *  - `AnthropicProvider` (real calls) and `MockAiProvider` (deterministic,
 *    offline) are interchangeable — see `provider.ts` for the factory that
 *    picks one based on whether an API key is configured.
 */

export interface DecisionSupportParams {
  message: string;
  history: DecisionAssistantMessage[];
  context: LiveSignals;
}

export interface BroadcastParams {
  message: string;
  languages: LanguageCode[];
}

export interface BroadcastTranslationResult {
  language: LanguageCode;
  text: string;
}

export interface BroadcastAiResult {
  translations: BroadcastTranslationResult[];
  plainLanguageVersion: string;
}

export interface AccessibilityInsightParams {
  requests: AccessibilityRequestItem[];
}

export interface AccessibilityInsight {
  id: string;
  priority: 'low' | 'medium' | 'high';
  recommendedAction: string;
}

export interface AiProvider {
  /** Streams the organizer-facing decision-support reply, chunk by chunk. */
  streamDecisionSupport(params: DecisionSupportParams): AsyncIterable<string>;
  /** Translates a broadcast into each requested language plus a plain-language variant. */
  translateBroadcast(params: BroadcastParams): Promise<BroadcastAiResult>;
  /** Prioritizes open accessibility requests and suggests a concrete next action for each. */
  prioritizeAccessibilityRequests(params: AccessibilityInsightParams): Promise<AccessibilityInsight[]>;
}
