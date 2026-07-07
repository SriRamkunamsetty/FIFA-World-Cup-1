import { generateLiveSignals } from '@/lib/simulation/liveSignals';
import { getAiProvider } from '@/lib/ai/provider';

export interface OperationalBriefing {
  briefing: string;
  generatedAt: string;
}

/**
 * Synthesizes the full live-operations snapshot into a short
 * organizer-facing situation report — the "operational intelligence"
 * capability named directly in the challenge brief, distinct from the
 * free-text Decision Assistant: this takes no user input at all, so there
 * is no untrusted text in the prompt for this feature.
 */
export async function generateOperationalBriefing(): Promise<OperationalBriefing> {
  const context = generateLiveSignals();
  const briefing = await getAiProvider().generateBriefing(context);
  return { briefing, generatedAt: context.generatedAt };
}
