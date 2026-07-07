import { NextResponse, type NextRequest } from 'next/server';
import { enforceRequestGuards } from '@/lib/security/guard';
import { decisionAssistantRequestSchema } from '@/lib/security/validation';
import { generateLiveSignals } from '@/lib/simulation/liveSignals';
import { getAiProvider } from '@/lib/ai/provider';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const guard = enforceRequestGuards(req, { routeKey: 'decision-assistant' });
  if (!guard.ok) return guard.response;

  const rawBody = await req.json().catch(() => null);
  const parsed = decisionAssistantRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request.' }, { status: 400 });
  }

  const context = generateLiveSignals();
  const provider = getAiProvider();

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of provider.streamDecisionSupport({
          message: parsed.data.message,
          history: parsed.data.history,
          context,
        })) {
          controller.enqueue(encoder.encode(chunk));
        }
      } catch (error) {
        controller.enqueue(
          encoder.encode('\n\n[The decision assistant is temporarily unavailable. Please try again.]'),
        );
        console.error('decision-assistant stream error:', error);
      } finally {
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
