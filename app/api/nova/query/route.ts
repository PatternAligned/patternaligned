export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Pool } from 'pg';
import { ALL_DDL } from '@/app/lib/db/schema';
import { routeQuery, executeQuery, ModelName } from '@/app/lib/nova/ModelRouter';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const NOVA_SYSTEM_PROMPT = `You are Nova, an AI tuned to this specific user's behavioral profile, cognitive style, and working preferences. You are not generic — every response should reflect what you know about how they think and work. Be direct, insightful, and genuinely useful.`;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id as string;

  let body: { query?: string; projectId?: string; overrideModel?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { query, projectId, overrideModel } = body;

  if (!query || typeof query !== 'string' || !query.trim()) {
    return NextResponse.json({ error: 'Query is required' }, { status: 400 });
  }

  // Run migrations
  try {
    for (const ddl of ALL_DDL.split(';\n').filter((s) => s.trim())) {
      await pool.query(ddl + ';');
    }
  } catch {
    // Best-effort
  }

  // Determine model
  let model: ModelName;
  if (overrideModel && ['ollama', 'claude', 'gpt', 'perplexity'].includes(overrideModel)) {
    model = overrideModel as ModelName;
  } else {
    try {
      model = await routeQuery(query, userId);
    } catch {
      model = 'claude';
    }
  }

  // Load user preferences
  let userPrefs: any = null;
  try {
    const prefsResult = await pool.query(
      `SELECT * FROM user_preferences WHERE user_id = $1`,
      [userId]
    );
    userPrefs = prefsResult.rows[0] || null;
  } catch {
    // Table may not exist yet
  }

  // Load latest vibe signal
  let vibeSignal: any = null;
  try {
    const vibeResult = await pool.query(
      `SELECT event_data FROM behavioral_events WHERE user_id = $1 AND event_type = 'vibe_signal' ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );
    if (vibeResult.rows[0]?.event_data) {
      vibeSignal = typeof vibeResult.rows[0].event_data === 'string'
        ? JSON.parse(vibeResult.rows[0].event_data)
        : vibeResult.rows[0].event_data;
    }
  } catch {
    // Best-effort
  }

  try {
    const result = await executeQuery({
      query,
      model,
      userId,
      projectId,
      systemPromptBase: NOVA_SYSTEM_PROMPT,
      vibeSignal,
      userPrefs,
    });

    return NextResponse.json({
      response: result.text,
      modelUsed: result.modelUsed,
      tokens: result.tokens,
      latency: result.latency,
      cost: result.cost,
      citations: result.citations,
      responseId: result.responseId,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Query failed' }, { status: 500 });
  }
}
