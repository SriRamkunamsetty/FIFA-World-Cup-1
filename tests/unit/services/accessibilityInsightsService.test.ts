import { describe, it, expect, vi } from 'vitest';
import { buildLiveSignalsFixture } from '../../fixtures/liveSignals';

const fixtureWithRequests = buildLiveSignalsFixture();
const fixtureNoRequests = buildLiveSignalsFixture({ accessibilityRequests: [] });

let currentFixture = fixtureWithRequests;

vi.mock('@/lib/simulation/liveSignals', () => ({
  generateLiveSignals: () => currentFixture,
}));

const prioritizeAccessibilityRequests = vi.fn(async () => [
  { id: 'acc-0', priority: 'high' as const, recommendedAction: 'Dispatch a volunteer.' },
]);

vi.mock('@/lib/ai/provider', () => ({
  getAiProvider: () => ({ prioritizeAccessibilityRequests }),
}));

const { getPrioritizedAccessibilityInsights } = await import('@/lib/services/accessibilityInsightsService');

describe('getPrioritizedAccessibilityInsights', () => {
  it('merges the AI priority/action back onto the original request record', async () => {
    currentFixture = fixtureWithRequests;
    const insights = await getPrioritizedAccessibilityInsights();

    expect(insights).toHaveLength(1);
    expect(insights[0]).toMatchObject({
      id: 'acc-0',
      gateId: 'gate-c',
      priority: 'high',
      recommendedAction: 'Dispatch a volunteer.',
    });
  });

  it('returns an empty array without calling the AI provider when there are no open requests', async () => {
    currentFixture = fixtureNoRequests;
    prioritizeAccessibilityRequests.mockClear();

    const insights = await getPrioritizedAccessibilityInsights();

    expect(insights).toEqual([]);
    expect(prioritizeAccessibilityRequests).not.toHaveBeenCalled();
  });

  it('falls back to a safe default when the AI response omits a request id', async () => {
    currentFixture = fixtureWithRequests;
    prioritizeAccessibilityRequests.mockResolvedValueOnce([]);

    const insights = await getPrioritizedAccessibilityInsights();

    expect(insights[0]?.priority).toBe('medium');
    expect(insights[0]?.recommendedAction).toContain('guest-services');
  });
});
