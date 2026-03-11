export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const COGNITIVE_PROFILES_DDL = `
CREATE TABLE IF NOT EXISTS cognitive_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  interview_session_id UUID,
  who_you_are TEXT,
  how_you_decide TEXT,
  what_you_need TEXT,
  measurements JSONB DEFAULT '{}',
  confidence_score INTEGER DEFAULT 0,
  confidence_explanation TEXT,
  is_validated BOOLEAN DEFAULT false,
  calibration_notes JSONB DEFAULT '[]',
  user_self_rating INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS cognitive_profiles_user_idx ON cognitive_profiles(user_id);
`;

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !(session.user as any)?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = (session.user as any).id;

  try {
    await pool.query(COGNITIVE_PROFILES_DDL);
  } catch {
    // ignore
  }

  const result = await pool
    .query(
      `SELECT * FROM cognitive_profiles WHERE user_id=$1 ORDER BY updated_at DESC LIMIT 1`,
      [userId]
    )
    .catch(() => ({ rows: [] as any[] }));

  if (result.rows.length === 0) {
    return NextResponse.json({ found: false });
  }

  const row = result.rows[0];

  return NextResponse.json({
    found: true,
    profile: {
      whoYouAre: row.who_you_are,
      howYouDecide: row.how_you_decide,
      whatYouNeed: row.what_you_need,
      measurements: row.measurements || {},
      confidence: {
        score: row.confidence_score || 0,
        explanation: row.confidence_explanation || '',
      },
      isValidated: row.is_validated || false,
      userSelfRating: row.user_self_rating || null,
    },
  });
}
