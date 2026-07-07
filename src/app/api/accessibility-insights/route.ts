import { NextResponse, type NextRequest } from 'next/server';
import { enforceRequestGuards } from '@/lib/security/guard';
import { getPrioritizedAccessibilityInsights } from '@/lib/services/accessibilityInsightsService';

export const runtime = 'nodejs';

/**
 * Implemented as POST rather than GET even though it takes no body: it
 * triggers a paid AI call, so it goes through the same rate-limit + CSRF
 * guard as every other AI-cost-incurring route (see `guard.ts`).
 */
export async function POST(req: NextRequest) {
  const guard = enforceRequestGuards(req, { routeKey: 'accessibility-insights' });
  if (!guard.ok) return guard.response;

  try {
    const insights = await getPrioritizedAccessibilityInsights();
    return NextResponse.json({ insights });
  } catch (error) {
    console.error('accessibility-insights error:', error);
    return NextResponse.json(
      { error: 'Could not generate accessibility insights right now. Please try again.' },
      { status: 502 },
    );
  }
}
