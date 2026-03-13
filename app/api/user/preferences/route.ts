export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const pool2 = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Derive preliminary cognitive baselines from stated preferences.
// These are low-confidence estimates (~30-40%) that get overridden by interview data.
function calculatePreferenceBaselines(use_cases: string[], tones: string[]) {
  const directnessSignals = ['direct', 'blunt', 'no_fluff', 'concise', 'concise_2', 'peer'].filter((t) => tones.includes(t));
  const directness_pct = Math.min(40, 15 + directnessSignals.length * 8);

  const sarcasm_pct = tones.includes('sarcastic') ? 35 : tones.includes('witty') ? 20 : 10;

  const rapidCases = ['shipping', 'debugging', 'testing', 'unblocking'].filter((u) => use_cases.includes(u));
  const deliberateCases = ['planning', 'architecture', 'research', 'system_design', 'strategy'].filter((u) => use_cases.includes(u));
  const execution_pct = Math.min(40, Math.max(10, 20 + (rapidCases.length - deliberateCases.length) * 5));

  const collabSignals = ['brainstorming', 'hiring'].filter((u) => use_cases.includes(u)).length
    + ['collaborative', 'warm', 'socratic'].filter((t) => tones.includes(t)).length;
  const collaboration_pct = Math.min(40, 15 + collabSignals * 6);

  const frictionCases = ['debugging', 'architecture', 'system_design', 'refactoring', 'performance', 'security'].filter((u) => use_cases.includes(u));
  const friction_tolerance_pct = Math.min(40, 15 + frictionCases.length * 5);

  const ambiguousCases = ['strategy', 'research', 'analysis', 'product', 'planning'].filter((u) => use_cases.includes(u));
  const contradiction_acceptance_pct = Math.min(40, 15 + ambiguousCases.length * 5);

  return { directness_pct, sarcasm_pct, execution_pct, friction_tolerance_pct, collaboration_pct, contradiction_acceptance_pct };
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any)?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;
    const result = await pool2.query(
      `SELECT use_cases, goals, tones, tools FROM user_preferences WHERE user_id = $1`,
      [userId]
    );
    return NextResponse.json({ preferences: result.rows[0] || null });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_preferences (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      use_cases JSONB DEFAULT '[]',
      goals TEXT,
      tones JSONB DEFAULT '[]',
      tools JSONB DEFAULT '[]',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !(session.user as any)?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { use_cases, goals, tones, tools } = await request.json();

    await ensureTable();

    await pool.query(
      `INSERT INTO user_preferences (user_id, use_cases, goals, tones, tools, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (user_id) DO UPDATE
       SET use_cases = EXCLUDED.use_cases,
           goals     = EXCLUDED.goals,
           tones     = EXCLUDED.tones,
           tools     = EXCLUDED.tools,
           updated_at = NOW()`,
      [
        userId,
        JSON.stringify(use_cases || []),
        goals || null,
        JSON.stringify(tones || []),
        JSON.stringify(tools || []),
      ]
    );

    // Write preliminary baselines from stated preferences (low confidence, version 0).
    // Only sets baseline if no interview-based baseline (version >= 1) exists yet.
    try {
      const baselines = calculatePreferenceBaselines(use_cases || [], tones || []);
      await pool.query(
        `INSERT INTO cognitive_baselines
           (user_id, baseline_version, directness_pct, sarcasm_pct, execution_pct,
            friction_tolerance_pct, collaboration_pct, contradiction_acceptance_pct)
         VALUES ($1, 0, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (user_id) DO UPDATE SET
           directness_pct            = CASE WHEN cognitive_baselines.baseline_version < 1 THEN $2 ELSE cognitive_baselines.directness_pct END,
           sarcasm_pct               = CASE WHEN cognitive_baselines.baseline_version < 1 THEN $3 ELSE cognitive_baselines.sarcasm_pct END,
           execution_pct             = CASE WHEN cognitive_baselines.baseline_version < 1 THEN $4 ELSE cognitive_baselines.execution_pct END,
           friction_tolerance_pct    = CASE WHEN cognitive_baselines.baseline_version < 1 THEN $5 ELSE cognitive_baselines.friction_tolerance_pct END,
           collaboration_pct         = CASE WHEN cognitive_baselines.baseline_version < 1 THEN $6 ELSE cognitive_baselines.collaboration_pct END,
           contradiction_acceptance_pct = CASE WHEN cognitive_baselines.baseline_version < 1 THEN $7 ELSE cognitive_baselines.contradiction_acceptance_pct END`,
        [
          userId,
          baselines.directness_pct,
          baselines.sarcasm_pct,
          baselines.execution_pct,
          baselines.friction_tolerance_pct,
          baselines.collaboration_pct,
          baselines.contradiction_acceptance_pct,
        ]
      );
    } catch (e) {
      console.error('Preference baseline write failed (non-blocking):', e instanceof Error ? e.message : e);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('User preferences save error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
