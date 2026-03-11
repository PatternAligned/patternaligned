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

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('User preferences save error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
