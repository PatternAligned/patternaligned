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
    CREATE TABLE IF NOT EXISTS user_profiles (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      role TEXT,
      description TEXT,
      current_work TEXT,
      domain TEXT,
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
    const { role, description, current_work, domain } = await request.json();

    await ensureTable();

    await pool.query(
      `INSERT INTO user_profiles (user_id, role, description, current_work, domain, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (user_id) DO UPDATE
       SET role = EXCLUDED.role,
           description = EXCLUDED.description,
           current_work = EXCLUDED.current_work,
           domain = EXCLUDED.domain,
           updated_at = NOW()`,
      [userId, role || null, description || null, current_work || null, domain || null]
    );

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('User profile save error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
