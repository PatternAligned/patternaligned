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

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS behavioral_events (
      id SERIAL PRIMARY KEY,
      user_id TEXT,
      event_type TEXT NOT NULL,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id || null;

    const { event_type, metadata } = await request.json();

    if (!event_type) {
      return NextResponse.json({ error: 'event_type is required' }, { status: 400 });
    }

    await ensureTable();
    const result = await pool.query(
      `INSERT INTO behavioral_events (user_id, event_type, metadata, created_at)
       VALUES ($1, $2, $3, NOW()) RETURNING id`,
      [userId, event_type, JSON.stringify(metadata || {})]
    );

    return NextResponse.json({ success: true, event_id: result.rows[0].id }, { status: 200 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Event logging error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
