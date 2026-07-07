import { NextResponse, type NextRequest } from 'next/server';
import { enforceRequestGuards } from '@/lib/security/guard';
import { generateOperationalBriefing } from '@/lib/services/operationalBriefingService';

export const runtime = 'nodejs';

/** POST (not GET) for the same reason as accessibility-insights: it costs an AI call. */
export async function POST(req: NextRequest) {
  const guard = enforceRequestGuards(req, { routeKey: 'briefing' });
  if (!guard.ok) return guard.response;

  try {
    const result = await generateOperationalBriefing();
    return NextResponse.json(result);
  } catch (error) {
    console.error('briefing error:', error);
    return NextResponse.json(
      { error: 'Could not generate the operational briefing right now. Please try again.' },
      { status: 502 },
    );
  }
}
