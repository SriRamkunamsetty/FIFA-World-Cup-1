import { getAiProvider } from '@/lib/ai/provider';
import { cacheKeyFor, getCachedBroadcast, setCachedBroadcast } from '@/lib/cache/broadcastCache';
import type { BroadcastResult, LanguageCode } from '@/types/domain';

/**
 * Translates an organizer's broadcast message, serving from the in-memory
 * cache when an identical (message, languages) pair was requested recently.
 * Pure domain logic — no HTTP, so it's testable without a NextRequest.
 */
export async function translateBroadcastMessage(
  message: string,
  languages: LanguageCode[],
): Promise<BroadcastResult> {
  const key = cacheKeyFor(message, languages);
  const cached = getCachedBroadcast(key);
  if (cached) {
    return { original: message, ...cached, cached: true };
  }

  const aiResult = await getAiProvider().translateBroadcast({ message, languages });
  setCachedBroadcast(key, aiResult);
  return { original: message, ...aiResult, cached: false };
}
