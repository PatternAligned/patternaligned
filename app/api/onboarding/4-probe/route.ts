export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logEvent } from '@/lib/analytics-logger';
import { v4 as uuidv4 } from 'uuid';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const VALID_VALUES: Record<string, string[]> = {
  compression: ['dense', 'sparse'],
  friction:    ['push', 'navigate'],
  execution:   ['rapid', 'deliberate'],
  contradiction: ['resolve', 'hold'],
};

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !(session.user as any)?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id as string;
    const body = await request.json();
    const { compression, friction, execution, contradiction } = body;

    // Validate all four probes are present and have expected values
    const answers = { compression, friction, execution, contradiction };
    for (const [key, value] of Object.entries(answers)) {
      if (!value || !VALID_VALUES[key].includes(value)) {
        return NextResponse.json(
          { error: `Invalid or missing value for probe: ${key}` },
          { status: 400 }
        );
      }
    }

    // Save to behavioral_events
    await pool.query(
      `INSERT INTO behavioral_events (user_id, event_type, metadata, created_at)
       VALUES ($1, $2, $3, NOW())`,
      [
        userId,
        '4_probe_completed',
        JSON.stringify({ compression, friction, execution, contradiction }),
      ]
    );

    // Log to analytics (fire-and-forget, non-blocking)
    const sessionId = uuidv4();
    logEvent(
      '4_probe_completed',
      { compression, friction, execution, contradiction },
      sessionId,
      { behavioralContext: { probeVersion: '1.0', probeCount: 4 } }
    ).catch(() => {}); // analytics failure must not break the response

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('4-probe route error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
