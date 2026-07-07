import { NextResponse } from 'next/server';
import { generateLiveSignals } from '@/lib/simulation/liveSignals';

export const dynamic = 'force-dynamic'; // always compute a fresh snapshot, never cache

/**
 * Read-only operational snapshot. No user input, so no validation or CSRF
 * needed — it's a plain GET with nothing to forge or inject. Rate limiting
 * is intentionally skipped here too since it's free to compute (no AI
 * call) and the dashboard polls it every few seconds.
 */
export async function GET() {
  const signals = generateLiveSignals();
  return NextResponse.json(signals);
}
