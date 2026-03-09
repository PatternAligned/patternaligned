export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logEvent } from '@/lib/analytics-logger';
import { v4 as uuidv4 } from 'uuid';

const VALID_VALUES: Record<string, string[]> = {
  compression: ['dense', 'sparse'],
  friction: ['push', 'navigate'],
  execution: ['rapid', 'deliberate'],
  contradiction: ['resolve', 'hold'],
};

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const email = session.user.email;
    const body = await request.json();
    const { compression, friction, execution, contradiction } = body;

    // Validate all four probes
    const answers = { compression, friction, execution, contradiction };
    for (const [key, value] of Object.entries(answers)) {
      if (!value || !VALID_VALUES[key].includes(value)) {
        return NextResponse.json(
          { error: `Invalid or missing value for probe: ${key}` },
          { status: 400 }
        );
      }
    }

    // Save to Render backend
    const backendResponse = await fetch(
      `${process.env.NEXT_PUBLIC_RENDER_BACKEND_URL}/behavioral/4-probe`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          compression,
          friction,
          execution,
          contradiction,
        }),
      }
    );

    if (!backendResponse.ok) {
      const error = await backendResponse.text();
      throw new Error(`Backend error: ${error}`);
    }

    const backendData = await backendResponse.json();
    const sessionId = backendData.sessionId || uuidv4();

    // Log to analytics (fire-and-forget)
    logEvent(
      '4-probe-answer',
      { compression, friction, execution, contradiction },
      sessionId,
      { behavioralContext: { version: '1.0' } }
    ).catch(() => {});

    return NextResponse.json({ success: true, sessionId }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('4-probe route error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}