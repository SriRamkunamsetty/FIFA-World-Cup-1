import { describe, it, expect, vi } from 'vitest';
import { buildLiveSignalsFixture } from '../../fixtures/liveSignals';

const fixture = buildLiveSignalsFixture();

vi.mock('@/lib/simulation/liveSignals', () => ({
  generateLiveSignals: vi.fn(() => fixture),
}));

async function* fakeStream() {
  yield 'Gate A ';
  yield 'is busy.';
}

const streamDecisionSupport = vi.fn(fakeStream);

vi.mock('@/lib/ai/provider', () => ({
  getAiProvider: () => ({ streamDecisionSupport }),
}));

const { streamDecisionAssistantReply } = await import('@/lib/services/decisionAssistantService');

describe('streamDecisionAssistantReply', () => {
  it('passes the message, history, and current live-signals context to the provider', async () => {
    const history = [{ role: 'user' as const, content: 'earlier question' }];
    const iterable = streamDecisionAssistantReply({ message: 'What about Gate A?', history });

    const chunks: string[] = [];
    for await (const chunk of iterable) chunks.push(chunk);

    expect(chunks.join('')).toBe('Gate A is busy.');
    expect(streamDecisionSupport).toHaveBeenCalledWith({
      message: 'What about Gate A?',
      history,
      context: fixture,
    });
  });
});
