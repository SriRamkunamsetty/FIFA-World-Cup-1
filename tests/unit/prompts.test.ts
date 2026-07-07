import { describe, it, expect } from 'vitest';
import { renderContextSummary } from '@/lib/ai/prompts';
import { buildLiveSignalsFixture } from '../fixtures/liveSignals';

describe('renderContextSummary', () => {
  it('includes the venue, gates, transit, and accessibility requests', () => {
    const summary = renderContextSummary(buildLiveSignalsFixture());

    expect(summary).toContain('Hard Rock Stadium');
    expect(summary).toContain('Gate A — North Plaza');
    expect(summary).toContain('Metrorail — Orange Line');
    expect(summary).toContain('wheelchair-escort');
  });

  it('reports "none" when there are no open accessibility requests', () => {
    const summary = renderContextSummary(buildLiveSignalsFixture({ accessibilityRequests: [] }));
    expect(summary).toContain('Open accessibility requests:\nnone');
  });
});
