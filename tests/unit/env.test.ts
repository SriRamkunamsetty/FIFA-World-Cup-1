import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const ORIGINAL_ENV = { ...process.env };

describe('env', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.resetModules();
  });

  it('applies sensible defaults when optional variables are unset', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.RATE_LIMIT_MAX;
    delete process.env.RATE_LIMIT_WINDOW_MS;

    const { env, hasRealAiProvider } = await import('@/lib/env');

    expect(hasRealAiProvider).toBe(false);
    expect(env.ANTHROPIC_MODEL).toBe('claude-sonnet-4-6');
    expect(env.RATE_LIMIT_MAX).toBe(20);
    expect(env.RATE_LIMIT_WINDOW_MS).toBe(60_000);
  });

  it('reports a real provider once an API key is present', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-test-value';

    const { hasRealAiProvider } = await import('@/lib/env');
    expect(hasRealAiProvider).toBe(true);
  });

  it('coerces numeric rate-limit env vars from strings', async () => {
    process.env.RATE_LIMIT_MAX = '5';
    process.env.RATE_LIMIT_WINDOW_MS = '10000';

    const { env } = await import('@/lib/env');
    expect(env.RATE_LIMIT_MAX).toBe(5);
    expect(env.RATE_LIMIT_WINDOW_MS).toBe(10_000);
  });
});
