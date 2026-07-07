import type {
  AiProvider,
  DecisionSupportParams,
  BroadcastParams,
  BroadcastAiResult,
  AccessibilityInsightParams,
  AccessibilityInsight,
} from './types';
import type { AccessibilityRequestType } from '@/types/domain';

/**
 * A fully deterministic, offline stand-in for the real Anthropic-backed
 * provider. It implements the exact same `AiProvider` interface so the rest
 * of the app — route handlers, components, tests — cannot tell which
 * provider is in use.
 *
 * This exists so that:
 *  - The app is 100% runnable and demoable with zero secrets and zero API
 *    cost (`npm run dev` works immediately after `npm install`).
 *  - Unit and component tests never make network calls or depend on a live
 *    model, so they are fast and reproducible in CI.
 *
 * It is intentionally simple rule-based logic, not a model — translations
 * are clearly tagged as an offline placeholder rather than pretending to be
 * real multilingual output.
 */
export class MockAiProvider implements AiProvider {
  async *streamDecisionSupport({ message, context }: DecisionSupportParams): AsyncIterable<string> {
    const reply = buildMockDecisionReply(message, context);
    const words = reply.split(' ');
    for (const word of words) {
      // Tiny delay so the UI's streaming rendering path is exercised even
      // in mock mode; negligible in tests.
      await delay(8);
      yield `${word} `;
    }
  }

  async translateBroadcast({ message, languages }: BroadcastParams): Promise<BroadcastAiResult> {
    return {
      translations: languages.map((language) => ({
        language,
        text: `[${language.toUpperCase()} · offline mock] ${message}`,
      })),
      plainLanguageVersion: toPlainLanguage(message),
    };
  }

  async prioritizeAccessibilityRequests({
    requests,
  }: AccessibilityInsightParams): Promise<AccessibilityInsight[]> {
    return requests.map((request) => {
      const priority = priorityFor(request.type, request.minutesOpen);
      return {
        id: request.id,
        priority,
        recommendedAction: recommendedActionFor(request.type, request.gateId),
      };
    });
  }

  async generateBriefing(context: DecisionSupportParams['context']): Promise<string> {
    return `${buildMockBriefingSentences(context).join(' ')} (Offline mock briefing — set ANTHROPIC_API_KEY for live Claude-generated analysis.)`;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildMockDecisionReply(message: string, context: DecisionSupportParams['context']): string {
  const busiest = [...context.gates].sort((a, b) => b.waitTimeMinutes - a.waitTimeMinutes)[0];
  const mentionedGate = context.gates.find((g) =>
    message.toLowerCase().includes((g.label.split('—')[0] ?? g.label).trim().toLowerCase()),
  );
  const focusGate = mentionedGate ?? busiest;

  if (!focusGate) {
    return "All gates are currently reporting low density. No redirection is needed right now — I'll flag it the moment that changes.";
  }

  const alternative =
    context.gates.find((g) => g.id !== focusGate.id && g.density === 'low') ?? context.gates[0];

  return (
    `${focusGate.label} is ${focusGate.density} density with a ${focusGate.waitTimeMinutes}-minute wait and ${focusGate.trend} trend. ` +
    `Recommend redirecting incoming flow toward ${alternative?.label ?? 'a quieter gate'} and adding a volunteer to the ${focusGate.zone} queue lane. ` +
    `(This is an offline mock reply — set ANTHROPIC_API_KEY for live Claude-generated guidance.)`
  );
}

function buildMockBriefingSentences(context: DecisionSupportParams['context']): string[] {
  const sentences: string[] = [];

  const busiest = [...context.gates].sort((a, b) => b.waitTimeMinutes - a.waitTimeMinutes)[0];
  sentences.push(
    busiest && busiest.density !== 'low'
      ? `${busiest.label} needs the most attention right now: ${busiest.density} density, ${busiest.waitTimeMinutes}-minute wait, ${busiest.trend}.`
      : 'All gates are reporting low-to-moderate density with no immediate crowd concerns.',
  );

  const disrupted = context.transit.find((t) => t.state !== 'on-time');
  if (disrupted) {
    sentences.push(
      `${disrupted.name} is ${disrupted.state} (ETA ${disrupted.etaMinutes} min) — factor this into arrival/departure guidance.`,
    );
  }

  if (context.weather.advisory) {
    sentences.push(context.weather.advisory);
  }

  const openLong = context.accessibilityRequests.filter((r) => r.status !== 'resolved' && r.minutesOpen > 15);
  if (openLong.length > 0) {
    sentences.push(
      `${openLong.length} accessibility request${openLong.length > 1 ? 's have' : ' has'} been open over 15 minutes — check the Accessibility Insights panel.`,
    );
  }

  const rail = context.transit.find((t) => t.mode === 'rail');
  const shuttle = context.transit.find((t) => t.mode === 'shuttle');
  if (rail?.state === 'on-time' && shuttle) {
    sentences.push(
      `${rail.name} is running normally — steering fans there over the shuttle reduces lot congestion and emissions.`,
    );
  }

  return sentences;
}

function toPlainLanguage(message: string): string {
  const trimmed = message.trim();
  const withoutTrailingPunctuation = trimmed.replace(/[.?!]+$/, '');
  return `${withoutTrailingPunctuation}. Please follow staff instructions.`;
}

function priorityFor(type: AccessibilityRequestType, minutesOpen: number): AccessibilityInsight['priority'] {
  if (type === 'medical') return 'high';
  if (type === 'wheelchair-escort' && minutesOpen > 15) return 'high';
  if (minutesOpen > 25) return 'medium';
  return 'low';
}

function recommendedActionFor(type: AccessibilityRequestType, gateId: string): string {
  switch (type) {
    case 'wheelchair-escort':
      return `Dispatch a mobility-assist volunteer to ${gateId} and route the guest via the nearest wheelchair-accessible gate.`;
    case 'sign-language':
      return `Send the on-call sign-language interpreter to ${gateId} now.`;
    case 'visual-assistance':
      return `Assign a guest-services escort to walk the guest from ${gateId} to their seating section.`;
    case 'sensory-quiet-space':
      return `Direct the guest from ${gateId} to the designated quiet room away from the concourse PA speakers.`;
    default:
      return `Send a guest-services staff member to ${gateId} to assess the request in person.`;
  }
}
