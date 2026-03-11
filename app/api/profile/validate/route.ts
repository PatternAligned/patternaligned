export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !(session.user as any)?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = (session.user as any).id;

  let body: { validated: boolean; userSelfRating?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { validated, userSelfRating } = body;

  try {
    await pool.query(
      `UPDATE cognitive_profiles
       SET is_validated=$1, user_self_rating=$2, updated_at=NOW()
       WHERE user_id=$3`,
      [validated, userSelfRating ?? null, userId]
    );
  } catch (err) {
    console.error('validate update failed:', err);
    return NextResponse.json({ error: 'Failed to update validation status' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
