export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Pool } from 'pg';
import { analyzeQueryType } from '@/app/lib/nova/ModelRouter';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id as string;

  let body: { responseId?: string; rating?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { responseId, rating } = body;

  if (!responseId || typeof rating !== 'number' || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'responseId and rating (1-5) are required' }, { status: 400 });
  }

  // Update the rating
  try {
    await pool.query(
      `UPDATE nova_responses SET user_rating = $1 WHERE id = $2`,
      [rating, responseId]
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Database error' }, { status: 500 });
  }

  // If rating >= 4, learn the preference
  if (rating >= 4) {
    try {
      const responseResult = await pool.query(
        `SELECT model_used, query FROM nova_responses WHERE id = $1`,
        [responseId]
      );

      if (responseResult.rows[0]) {
        const { model_used: modelUsed, query } = responseResult.rows[0];
        const queryType = analyzeQueryType(query || '');

        // Upsert into user_model_preferences to set this queryType → model
        await pool.query(
          `INSERT INTO user_model_preferences (user_id, query_type_preferences, updated_at)
           VALUES ($1, jsonb_build_object($2::text, $3::text), NOW())
           ON CONFLICT (user_id)
           DO UPDATE SET
             query_type_preferences = user_model_preferences.query_type_preferences || jsonb_build_object($2::text, $3::text),
             updated_at = NOW()`,
          [userId, queryType, modelUsed]
        );
      }
    } catch {
      // Best-effort — never fail the request on preference update
    }
  } else if (rating <= 2) {
    // On low rating, remove the learned preference for this query type if it exists
    try {
      const responseResult = await pool.query(
        `SELECT model_used, query FROM nova_responses WHERE id = $1`,
        [responseId]
      );

      if (responseResult.rows[0]) {
        const { query } = responseResult.rows[0];
        const queryType = analyzeQueryType(query || '');

        await pool.query(
          `UPDATE user_model_preferences
           SET query_type_preferences = query_type_preferences - $2,
               updated_at = NOW()
           WHERE user_id = $1`,
          [userId, queryType]
        );
      }
    } catch {
      // Best-effort
    }
  }

  return NextResponse.json({ success: true });
}
