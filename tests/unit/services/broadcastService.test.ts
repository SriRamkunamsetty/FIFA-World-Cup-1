import { describe, it, expect, vi, beforeEach } from 'vitest';
import { _resetBroadcastCacheForTests } from '@/lib/cache/broadcastCache';

const translateBroadcast = vi.fn(async ({ languages }: { message: string; languages: string[] }) => ({
  translations: languages.map((language) => ({ language, text: `translated (${language})` })),
  plainLanguageVersion: 'plain version',
}));

vi.mock('@/lib/ai/provider', () => ({
  getAiProvider: () => ({ translateBroadcast }),
}));

const { translateBroadcastMessage } = await import('@/lib/services/broadcastService');

describe('translateBroadcastMessage', () => {
  beforeEach(() => {
    _resetBroadcastCacheForTests();
    translateBroadcast.mockClear();
  });

  it('calls the AI provider on a cache miss and marks the result as not cached', async () => {
    const result = await translateBroadcastMessage('Gate B closing soon.', ['en']);

    expect(translateBroadcast).toHaveBeenCalledTimes(1);
    expect(result.cached).toBe(false);
    expect(result.original).toBe('Gate B closing soon.');
  });

  it('serves an identical request from cache without calling the AI provider again', async () => {
    await translateBroadcastMessage('Gate B closing soon.', ['en']);
    const second = await translateBroadcastMessage('Gate B closing soon.', ['en']);

    expect(translateBroadcast).toHaveBeenCalledTimes(1);
    expect(second.cached).toBe(true);
  });

  it('treats a different message as a cache miss', async () => {
    await translateBroadcastMessage('Gate B closing soon.', ['en']);
    const result = await translateBroadcastMessage('Gate C closing soon.', ['en']);

    expect(translateBroadcast).toHaveBeenCalledTimes(2);
    expect(result.cached).toBe(false);
  });
});
