import { describe, it, expect, vi, beforeEach } from 'vitest';

// The real env module validates process.env at import time. Mocking it lets
// each test control ANTHROPIC_API_KEY without touching real process.env or
// needing a real secret.
vi.mock('@/lib/env', () => ({
  env: {
    ANTHROPIC_API_KEY: 'test-key',
    ANTHROPIC_MODEL: 'claude-sonnet-4-6',
    CSRF_SECRET: 'test-secret-at-least-16-chars',
    RATE_LIMIT_MAX: 20,
    RATE_LIMIT_WINDOW_MS: 60_000,
    NODE_ENV: 'test',
  },
  hasRealAiProvider: true,
}));

const { AnthropicProvider } = await import('@/lib/ai/client');
const { buildLiveSignalsFixture } = await import('../fixtures/liveSignals');

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

function sseResponse(events: string[]): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const event of events) controller.enqueue(encoder.encode(event));
      controller.close();
    },
  });
  return new Response(stream, { status: 200 });
}

describe('AnthropicProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('translates a broadcast by parsing the model JSON response', async () => {
    const fakeFetch = vi.fn().mockResolvedValue(
      jsonResponse({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              translations: [{ language: 'es', text: 'La puerta B cierra pronto.' }],
              plainLanguageVersion: 'Gate B is closing soon.',
            }),
          },
        ],
      }),
    );

    const provider = new AnthropicProvider(fakeFetch as unknown as typeof fetch);
    const result = await provider.translateBroadcast({ message: 'Gate B closing soon.', languages: ['es'] });

    expect(result.translations).toEqual([{ language: 'es', text: 'La puerta B cierra pronto.' }]);
    expect(result.plainLanguageVersion).toBe('Gate B is closing soon.');
    expect(fakeFetch).toHaveBeenCalledWith(
      'https://api.anthropic.com/v1/messages',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('throws a clear error when the model response is not valid JSON', async () => {
    const fakeFetch = vi.fn().mockResolvedValue(jsonResponse({ content: [{ type: 'text', text: 'not json' }] }));
    const provider = new AnthropicProvider(fakeFetch as unknown as typeof fetch);

    await expect(provider.translateBroadcast({ message: 'hi', languages: ['en'] })).rejects.toThrow(
      /not valid JSON/,
    );
  });

  it('throws when the model JSON does not match the expected shape', async () => {
    const fakeFetch = vi
      .fn()
      .mockResolvedValue(jsonResponse({ content: [{ type: 'text', text: JSON.stringify({ oops: true }) }] }));
    const provider = new AnthropicProvider(fakeFetch as unknown as typeof fetch);

    await expect(provider.translateBroadcast({ message: 'hi', languages: ['en'] })).rejects.toThrow();
  });

  it('throws a descriptive error when the API responds with a non-OK status', async () => {
    const fakeFetch = vi.fn().mockResolvedValue(new Response('rate limited', { status: 429 }));
    const provider = new AnthropicProvider(fakeFetch as unknown as typeof fetch);

    await expect(provider.translateBroadcast({ message: 'hi', languages: ['en'] })).rejects.toThrow(/429/);
  });

  it('prioritizes accessibility requests by parsing the model JSON response', async () => {
    const fakeFetch = vi.fn().mockResolvedValue(
      jsonResponse({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              insights: [{ id: 'acc-0', priority: 'high', recommendedAction: 'Dispatch mobility volunteer.' }],
            }),
          },
        ],
      }),
    );
    const provider = new AnthropicProvider(fakeFetch as unknown as typeof fetch);
    const context = buildLiveSignalsFixture();

    const insights = await provider.prioritizeAccessibilityRequests({ requests: context.accessibilityRequests });
    expect(insights).toEqual([{ id: 'acc-0', priority: 'high', recommendedAction: 'Dispatch mobility volunteer.' }]);
  });

  it('parses a streamed SSE response into concatenated text deltas', async () => {
    const events = [
      `event: content_block_delta\ndata: ${JSON.stringify({ type: 'content_block_delta', delta: { type: 'text_delta', text: 'Gate A ' } })}\n\n`,
      `event: content_block_delta\ndata: ${JSON.stringify({ type: 'content_block_delta', delta: { type: 'text_delta', text: 'is busy.' } })}\n\n`,
      `event: message_stop\ndata: ${JSON.stringify({ type: 'message_stop' })}\n\n`,
    ];
    const fakeFetch = vi.fn().mockResolvedValue(sseResponse(events));
    const provider = new AnthropicProvider(fakeFetch as unknown as typeof fetch);
    const context = buildLiveSignalsFixture();

    let full = '';
    for await (const chunk of provider.streamDecisionSupport({ message: 'status?', history: [], context })) {
      full += chunk;
    }

    expect(full).toBe('Gate A is busy.');
  });
});
