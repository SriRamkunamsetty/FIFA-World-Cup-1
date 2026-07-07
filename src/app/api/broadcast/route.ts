import { NextResponse, type NextRequest } from 'next/server';
import { enforceRequestGuards } from '@/lib/security/guard';
import { broadcastRequestSchema } from '@/lib/security/validation';
import { getAiProvider } from '@/lib/ai/provider';
import { cacheKeyFor, getCachedBroadcast, setCachedBroadcast } from '@/lib/cache/broadcastCache';
import type { BroadcastResult } from '@/types/domain';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const guard = enforceRequestGuards(req, { routeKey: 'broadcast' });
  if (!guard.ok) return guard.response;

  const rawBody = await req.json().catch(() => null);
  const parsed = broadcastRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request.' }, { status: 400 });
  }

  const { message, languages } = parsed.data;
  const key = cacheKeyFor(message, languages);
  const cachedResult = getCachedBroadcast(key);

  if (cachedResult) {
    const result: BroadcastResult = { original: message, ...cachedResult, cached: true };
    return NextResponse.json(result);
  }

  try {
    const aiResult = await getAiProvider().translateBroadcast({ message, languages });
    setCachedBroadcast(key, aiResult);
    const result: BroadcastResult = { original: message, ...aiResult, cached: false };
    return NextResponse.json(result);
  } catch (error) {
    console.error('broadcast translation error:', error);
    return NextResponse.json(
      { error: 'Could not translate the broadcast right now. Please try again.' },
      { status: 502 },
    );
  }
}
