import { NextResponse, type NextRequest } from 'next/server';
import { enforceRequestGuards } from '@/lib/security/guard';
import { generateLiveSignals } from '@/lib/simulation/liveSignals';
import { getAiProvider } from '@/lib/ai/provider';

export const runtime = 'nodejs';

/**
 * Implemented as POST rather than GET even though it takes no body: it
 * triggers a paid AI call, so it goes through the same rate-limit + CSRF
 * guard as every other AI-cost-incurring route (see `guard.ts`).
 */
export async function POST(req: NextRequest) {
  const guard = enforceRequestGuards(req, { routeKey: 'accessibility-insights' });
  if (!guard.ok) return guard.response;

  const context = generateLiveSignals();

  if (context.accessibilityRequests.length === 0) {
    return NextResponse.json({ insights: [] });
  }

  try {
    const insights = await getAiProvider().prioritizeAccessibilityRequests({
      requests: context.accessibilityRequests,
    });

    // Merge the AI's prioritization back onto the original request records
    // so the UI has both the operational facts and the recommendation in
    // one place, without ever letting the AI's output overwrite the facts.
    const merged = context.accessibilityRequests.map((request) => {
      const insight = insights.find((i) => i.id === request.id);
      return {
        ...request,
        priority: insight?.priority ?? 'medium',
        recommendedAction: insight?.recommendedAction ?? 'Send a guest-services staff member to assess in person.',
      };
    });

    return NextResponse.json({ insights: merged });
  } catch (error) {
    console.error('accessibility-insights error:', error);
    return NextResponse.json(
      { error: 'Could not generate accessibility insights right now. Please try again.' },
      { status: 502 },
    );
  }
}
