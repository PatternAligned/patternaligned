export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Pool } from 'pg';
import { USER_MODEL_PREFERENCES_DDL } from '@/app/lib/db/schema';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function runMigrations() {
  try {
    await pool.query(USER_MODEL_PREFERENCES_DDL);
  } catch {
    // Best-effort
  }
}

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id as string;
  await runMigrations();

  try {
    const result = await pool.query(
      `SELECT * FROM user_model_preferences WHERE user_id = $1`,
      [userId]
    );

    if (result.rows[0]) {
      return NextResponse.json(result.rows[0]);
    }

    // Return defaults if no row exists
    return NextResponse.json({
      user_id: userId,
      default_model: 'ollama',
      query_type_preferences: {},
      model_priority_order: ['ollama', 'claude', 'gpt', 'perplexity'],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Database error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id as string;
  await runMigrations();

  let body: {
    defaultModel?: string;
    queryTypePrefs?: Record<string, string>;
    modelPriorityOrder?: string[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { defaultModel, queryTypePrefs, modelPriorityOrder } = body;

  try {
    await pool.query(
      `INSERT INTO user_model_preferences (user_id, default_model, query_type_preferences, model_priority_order, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET
         default_model = COALESCE($2, user_model_preferences.default_model),
         query_type_preferences = COALESCE($3, user_model_preferences.query_type_preferences),
         model_priority_order = COALESCE($4, user_model_preferences.model_priority_order),
         updated_at = NOW()`,
      [
        userId,
        defaultModel || 'ollama',
        queryTypePrefs ? JSON.stringify(queryTypePrefs) : null,
        modelPriorityOrder ? JSON.stringify(modelPriorityOrder) : null,
      ]
    );

    const result = await pool.query(
      `SELECT * FROM user_model_preferences WHERE user_id = $1`,
      [userId]
    );

    return NextResponse.json(result.rows[0]);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Database error' }, { status: 500 });
  }
}
