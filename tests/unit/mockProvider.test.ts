import { describe, it, expect } from 'vitest';
import { MockAiProvider } from '@/lib/ai/mockProvider';
import { buildLiveSignalsFixture } from '../fixtures/liveSignals';

describe('MockAiProvider', () => {
  const provider = new MockAiProvider();

  it('streams a decision-support reply that mentions the busiest gate', async () => {
    const context = buildLiveSignalsFixture();
    let full = '';
    for await (const chunk of provider.streamDecisionSupport({ message: 'status?', history: [], context })) {
      full += chunk;
    }
    expect(full).toContain('Gate A');
    expect(full.length).toBeGreaterThan(0);
  });

  it('returns one clearly-labeled translation per requested language', async () => {
    const result = await provider.translateBroadcast({ message: 'Gate B is closing.', languages: ['en', 'es', 'fr'] });
    expect(result.translations).toHaveLength(3);
    expect(result.translations.map((t) => t.language)).toEqual(['en', 'es', 'fr']);
    for (const t of result.translations) {
      expect(t.text).toContain('offline mock');
    }
    expect(result.plainLanguageVersion.length).toBeGreaterThan(0);
  });

  it('prioritizes accessibility requests, keeping the same ids and count', async () => {
    const context = buildLiveSignalsFixture();
    const insights = await provider.prioritizeAccessibilityRequests({ requests: context.accessibilityRequests });

    expect(insights).toHaveLength(context.accessibilityRequests.length);
    expect(insights.map((i) => i.id)).toEqual(context.accessibilityRequests.map((r) => r.id));
    for (const insight of insights) {
      expect(['low', 'medium', 'high']).toContain(insight.priority);
      expect(insight.recommendedAction.length).toBeGreaterThan(0);
    }
  });

  it('always rates a medical request as high priority', async () => {
    const context = buildLiveSignalsFixture({
      accessibilityRequests: [
        { id: 'acc-medical', type: 'medical', gateId: 'gate-a', status: 'open', minutesOpen: 2, note: 'test' },
      ],
    });
    const insights = await provider.prioritizeAccessibilityRequests({ requests: context.accessibilityRequests });
    expect(insights[0]?.priority).toBe('high');
  });
});
