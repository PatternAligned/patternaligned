export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function ensureTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS nova_configuration (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      nova_name TEXT NOT NULL DEFAULT 'Nova',
      show_percentages_on_dashboard BOOLEAN DEFAULT true,
      last_updated TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS cognitive_baselines (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      baseline_version INTEGER DEFAULT 1,
      directness_pct INTEGER DEFAULT 0,
      sarcasm_pct INTEGER DEFAULT 0,
      execution_pct INTEGER DEFAULT 0,
      friction_tolerance_pct INTEGER DEFAULT 0,
      collaboration_pct INTEGER DEFAULT 0,
      contradiction_acceptance_pct INTEGER DEFAULT 0,
      created_from_interview_at TIMESTAMPTZ
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS behavioral_state (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      session_id TEXT,
      directness_pct INTEGER DEFAULT 0,
      sarcasm_pct INTEGER DEFAULT 0,
      execution_pct INTEGER DEFAULT 0,
      friction_tolerance_pct INTEGER DEFAULT 0,
      collaboration_pct INTEGER DEFAULT 0,
      contradiction_acceptance_pct INTEGER DEFAULT 0,
      last_updated TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any)?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;
    await ensureTables();

    const result = await pool.query(
      `SELECT nova_name, show_percentages_on_dashboard FROM nova_configuration WHERE user_id = $1`,
      [userId]
    );

    const config = result.rows[0] || { nova_name: 'Nova', show_percentages_on_dashboard: true };
    return NextResponse.json(config);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any)?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;
    await ensureTables();

    const { nova_name, show_percentages_on_dashboard } = await req.json();

    await pool.query(
      `INSERT INTO nova_configuration (user_id, nova_name, show_percentages_on_dashboard, last_updated)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id) DO UPDATE
         SET nova_name = COALESCE($2, nova_configuration.nova_name),
             show_percentages_on_dashboard = COALESCE($3, nova_configuration.show_percentages_on_dashboard),
             last_updated = NOW()`,
      [userId, nova_name || 'Nova', show_percentages_on_dashboard ?? true]
    );

    return NextResponse.json({ ok: true, nova_name: nova_name || 'Nova' });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
