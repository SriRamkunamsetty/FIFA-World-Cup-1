import { generateLiveSignals } from '@/lib/simulation/liveSignals';
import { getAiProvider } from '@/lib/ai/provider';
import type { DecisionAssistantMessage } from '@/types/domain';

export interface DecisionAssistantRequest {
  message: string;
  history: DecisionAssistantMessage[];
}

/**
 * Resolves the current live-operations context and streams the AI
 * provider's grounded reply. This is the entire domain logic for the
 * Decision Assistant feature — it has no knowledge of HTTP, so it's
 * directly unit-testable and reusable outside a Next.js route handler
 * (e.g. from a CLI or a future non-web client) without change.
 */
export function streamDecisionAssistantReply({
  message,
  history,
}: DecisionAssistantRequest): AsyncIterable<string> {
  const context = generateLiveSignals();
  return getAiProvider().streamDecisionSupport({ message, history, context });
}
