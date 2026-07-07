import { NextResponse, type NextRequest } from 'next/server';
import { enforceRequestGuards } from '@/lib/security/guard';
import { broadcastRequestSchema } from '@/lib/security/validation';
import { translateBroadcastMessage } from '@/lib/services/broadcastService';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const guard = enforceRequestGuards(req, { routeKey: 'broadcast' });
  if (!guard.ok) return guard.response;

  const rawBody = await req.json().catch(() => null);
  const parsed = broadcastRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid request.' },
      { status: 400 },
    );
  }

  try {
    const result = await translateBroadcastMessage(parsed.data.message, parsed.data.languages);
    return NextResponse.json(result);
  } catch (error) {
    console.error('broadcast translation error:', error);
    return NextResponse.json(
      { error: 'Could not translate the broadcast right now. Please try again.' },
      { status: 502 },
    );
  }
}
