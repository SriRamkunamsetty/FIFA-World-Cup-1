import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('getAiProvider', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns a MockAiProvider when no API key is configured', async () => {
    vi.doMock('@/lib/env', () => ({
      env: { ANTHROPIC_MODEL: 'claude-sonnet-4-6' },
      hasRealAiProvider: false,
    }));
    const { getAiProvider } = await import('@/lib/ai/provider');
    const { MockAiProvider } = await import('@/lib/ai/mockProvider');

    expect(getAiProvider()).toBeInstanceOf(MockAiProvider);
  });

  it('returns an AnthropicProvider when an API key is configured', async () => {
    vi.doMock('@/lib/env', () => ({
      env: { ANTHROPIC_API_KEY: 'test-key', ANTHROPIC_MODEL: 'claude-sonnet-4-6' },
      hasRealAiProvider: true,
    }));
    const { getAiProvider } = await import('@/lib/ai/provider');
    const { AnthropicProvider } = await import('@/lib/ai/client');

    expect(getAiProvider()).toBeInstanceOf(AnthropicProvider);
  });

  it('caches the provider instance as a singleton across calls', async () => {
    vi.doMock('@/lib/env', () => ({
      env: { ANTHROPIC_MODEL: 'claude-sonnet-4-6' },
      hasRealAiProvider: false,
    }));
    const { getAiProvider } = await import('@/lib/ai/provider');

    expect(getAiProvider()).toBe(getAiProvider());
  });

  it('_resetAiProviderForTests forces a fresh instance on the next call', async () => {
    vi.doMock('@/lib/env', () => ({
      env: { ANTHROPIC_MODEL: 'claude-sonnet-4-6' },
      hasRealAiProvider: false,
    }));
    const { getAiProvider, _resetAiProviderForTests } = await import('@/lib/ai/provider');

    const first = getAiProvider();
    _resetAiProviderForTests();
    const second = getAiProvider();

    expect(first).not.toBe(second);
  });
});
