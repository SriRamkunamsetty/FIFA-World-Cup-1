import { describe, it, expect, vi } from 'vitest';
import { buildLiveSignalsFixture } from '../../fixtures/liveSignals';

const fixture = buildLiveSignalsFixture();

vi.mock('@/lib/simulation/liveSignals', () => ({
  generateLiveSignals: () => fixture,
}));

const generateBriefing = vi.fn(async () => 'Gate A needs attention.');

vi.mock('@/lib/ai/provider', () => ({
  getAiProvider: () => ({ generateBriefing }),
}));

const { generateOperationalBriefing } = await import('@/lib/services/operationalBriefingService');

describe('generateOperationalBriefing', () => {
  it('passes the current live-signals context to the provider and returns its briefing text', async () => {
    const result = await generateOperationalBriefing();

    expect(generateBriefing).toHaveBeenCalledWith(fixture);
    expect(result.briefing).toBe('Gate A needs attention.');
    expect(result.generatedAt).toBe(fixture.generatedAt);
  });
});
