import { generateLiveSignals } from '@/lib/simulation/liveSignals';
import { getAiProvider } from '@/lib/ai/provider';
import type { AccessibilityRequestItem } from '@/types/domain';

export type AccessibilityInsight = AccessibilityRequestItem & {
  priority: 'low' | 'medium' | 'high';
  recommendedAction: string;
};

const FALLBACK_PRIORITY = 'medium' as const;
const FALLBACK_ACTION = 'Send a guest-services staff member to assess in person.';

/**
 * Prioritizes the current open accessibility requests and merges the AI's
 * recommendation back onto the original records. The AI only ever
 * *annotates* (priority, recommendedAction) — it can't overwrite the
 * underlying operational facts (gateId, minutesOpen, etc.), which always
 * come from the server-side simulation.
 */
export async function getPrioritizedAccessibilityInsights(): Promise<AccessibilityInsight[]> {
  const context = generateLiveSignals();
  if (context.accessibilityRequests.length === 0) return [];

  const insights = await getAiProvider().prioritizeAccessibilityRequests({
    requests: context.accessibilityRequests,
  });

  return context.accessibilityRequests.map((request) => {
    const insight = insights.find((i) => i.id === request.id);
    return {
      ...request,
      priority: insight?.priority ?? FALLBACK_PRIORITY,
      recommendedAction: insight?.recommendedAction ?? FALLBACK_ACTION,
    };
  });
}
