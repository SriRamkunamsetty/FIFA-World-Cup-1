import { hasRealAiProvider } from '@/lib/env';
import { AnthropicProvider } from './client';
import { MockAiProvider } from './mockProvider';
import type { AiProvider } from './types';

let cached: AiProvider | null = null;

/**
 * Returns the active AI provider: real Claude calls when
 * `ANTHROPIC_API_KEY` is configured, otherwise the deterministic offline
 * mock. Cached as a singleton since both implementations are stateless.
 */
export function getAiProvider(): AiProvider {
  if (!cached) {
    cached = hasRealAiProvider ? new AnthropicProvider() : new MockAiProvider();
  }
  return cached;
}

/** Exposed for tests only, so each test can force a fresh provider. */
export function _resetAiProviderForTests(): void {
  cached = null;
}
