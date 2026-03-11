export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const pool = new Pool({
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

    // Get user's goal string from preferences
    const prefsResult = await pool.query(
      `SELECT goals FROM user_preferences WHERE user_id = $1`,
      [userId]
    );
    const rawGoals: string | null = prefsResult.rows[0]?.goals || null;

    // Get all goal events for this user
    let goalEvents: { goal_tag: string; count: string }[] = [];
    try {
      const eventsResult = await pool.query(
        `SELECT goal_tag, COUNT(*) as count FROM goal_events WHERE user_id = $1 GROUP BY goal_tag ORDER BY count DESC`,
        [userId]
      );
      goalEvents = eventsResult.rows;
    } catch {
      // goal_events table might not exist yet
    }

    const totalInteractions = goalEvents.reduce((sum, e) => sum + parseInt(e.count), 0);

    const progress = goalEvents.map((e) => ({
      goal: e.goal_tag,
      interactions: parseInt(e.count),
      pct: totalInteractions > 0 ? Math.round((parseInt(e.count) / totalInteractions) * 100) : 0,
    }));

    return NextResponse.json({ goals_text: rawGoals, progress, total_interactions: totalInteractions });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
