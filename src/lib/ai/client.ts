import { z } from 'zod';
import { env } from '@/lib/env';
import { languageCodeSchema } from '@/lib/security/validation';
import { renderContextSummary, DECISION_ASSISTANT_SYSTEM_PROMPT, BROADCAST_SYSTEM_PROMPT, ACCESSIBILITY_SYSTEM_PROMPT } from './prompts';
import type {
  AiProvider,
  DecisionSupportParams,
  BroadcastParams,
  BroadcastAiResult,
  AccessibilityInsightParams,
  AccessibilityInsight,
} from './types';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

type AnthropicMessage = { role: 'user' | 'assistant'; content: string };

interface CallOptions {
  system: string;
  messages: AnthropicMessage[];
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}

/** Injectable so tests can substitute a fake `fetch` without any network access. */
type FetchLike = typeof fetch;

/**
 * Real AI provider backed by the Anthropic Messages API.
 *
 * `fetchImpl` is dependency-injected (defaults to the global `fetch`) so
 * this class can be unit-tested with a mock network layer instead of either
 * skipping coverage or making real API calls in CI.
 */
export class AnthropicProvider implements AiProvider {
  constructor(private readonly fetchImpl: FetchLike = fetch) {}

  private async call(options: CallOptions): Promise<Response> {
    if (!env.ANTHROPIC_API_KEY) {
      // Defensive guard: the provider factory should never construct this
      // class without a key, but fail loudly here too rather than sending
      // an unauthenticated request.
      throw new Error('AnthropicProvider used without ANTHROPIC_API_KEY configured.');
    }

    const response = await this.fetchImpl(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: env.ANTHROPIC_MODEL,
        max_tokens: options.maxTokens ?? 600,
        temperature: options.temperature ?? 0.4,
        system: options.system,
        messages: options.messages,
        stream: options.stream ?? false,
      }),
    });

    if (!response.ok || !response.body) {
      const body = await response.text().catch(() => '');
      throw new Error(`Anthropic API error (${response.status}): ${body.slice(0, 300)}`);
    }

    return response;
  }

  async *streamDecisionSupport({ message, history, context }: DecisionSupportParams): AsyncIterable<string> {
    const messages: AnthropicMessage[] = [
      ...history.map((h) => ({ role: h.role, content: h.content })),
      {
        role: 'user',
        content: `Live operations context:\n${renderContextSummary(context)}\n\nOrganizer message: ${message}`,
      },
    ];

    const response = await this.call({
      system: DECISION_ASSISTANT_SYSTEM_PROMPT,
      messages,
      stream: true,
      maxTokens: 400,
    });

    yield* parseAnthropicTextStream(response.body!);
  }

  async translateBroadcast({ message, languages }: BroadcastParams): Promise<BroadcastAiResult> {
    const response = await this.call({
      system: BROADCAST_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Target languages: ${languages.join(', ')}\nOrganizer message: ${message}`,
        },
      ],
      maxTokens: 500,
    });

    const text = await extractText(response);
    return broadcastResponseSchema.parse(safeJsonParse(text));
  }

  async prioritizeAccessibilityRequests({ requests }: AccessibilityInsightParams): Promise<AccessibilityInsight[]> {
    const response = await this.call({
      system: ACCESSIBILITY_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: JSON.stringify(requests) }],
      maxTokens: 500,
    });

    const text = await extractText(response);
    const parsed = accessibilityResponseSchema.parse(safeJsonParse(text));
    return parsed.insights;
  }
}

// --- Response parsing & validation -----------------------------------------

const broadcastResponseSchema = z.object({
  translations: z.array(z.object({ language: languageCodeSchema, text: z.string() })),
  plainLanguageVersion: z.string(),
});

const accessibilityResponseSchema = z.object({
  insights: z.array(
    z.object({
      id: z.string(),
      priority: z.enum(['low', 'medium', 'high']),
      recommendedAction: z.string(),
    }),
  ),
});

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('AI response was not valid JSON.');
  }
}

async function extractText(response: Response): Promise<string> {
  const data = (await response.json()) as { content?: Array<{ type: string; text?: string }> };
  const textBlock = data.content?.find((block) => block.type === 'text');
  if (!textBlock?.text) {
    throw new Error('AI response contained no text content.');
  }
  return textBlock.text;
}

/**
 * Parses an Anthropic streaming (SSE) response body into plain text
 * chunks, yielding each `content_block_delta` text fragment as it arrives.
 */
async function* parseAnthropicTextStream(body: ReadableStream<Uint8Array>): AsyncIterable<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const events = buffer.split('\n\n');
      buffer = events.pop() ?? '';

      for (const event of events) {
        const dataLine = event.split('\n').find((line) => line.startsWith('data: '));
        if (!dataLine) continue;

        const jsonStr = dataLine.slice('data: '.length);
        let payload: unknown;
        try {
          payload = JSON.parse(jsonStr);
        } catch {
          continue; // ignore malformed/keep-alive lines rather than crash the stream
        }

        const delta = (payload as { type?: string; delta?: { type?: string; text?: string } }).delta;
        if ((payload as { type?: string }).type === 'content_block_delta' && delta?.type === 'text_delta' && delta.text) {
          yield delta.text;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
