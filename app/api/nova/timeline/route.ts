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

export interface TimelineDay {
  date: string;        // 'YYYY-MM-DD'
  activity: number;    // behavioral_events count
  goals: number;       // goal_events count
  confidence: number | null; // snapshot from interview if available on or before this day
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any)?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;

    // Build 30-day date range
    const days: TimelineDay[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push({
        date: d.toISOString().slice(0, 10),
        activity: 0,
        goals: 0,
        confidence: null,
      });
    }
    const dateIndex = Object.fromEntries(days.map((d, i) => [d.date, i]));

    // Activity per day
    const activityResult = await pool.query(
      `SELECT DATE(created_at AT TIME ZONE 'UTC') as day, COUNT(*) as count
       FROM behavioral_events
       WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '30 days'
       GROUP BY day`,
      [userId]
    );
    activityResult.rows.forEach((r) => {
      const idx = dateIndex[r.day];
      if (idx !== undefined) days[idx].activity = parseInt(r.count);
    });

    // Goal interactions per day
    try {
      const goalResult = await pool.query(
        `SELECT DATE(created_at AT TIME ZONE 'UTC') as day, COUNT(*) as count
         FROM goal_events
         WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '30 days'
         GROUP BY day`,
        [userId]
      );
      goalResult.rows.forEach((r) => {
        const idx = dateIndex[r.day];
        if (idx !== undefined) days[idx].goals = parseInt(r.count);
      });
    } catch { /* goal_events may not exist */ }

    // Confidence snapshots — fill forward from interview sessions
    const confidenceResult = await pool.query(
      `SELECT DATE(created_at AT TIME ZONE 'UTC') as day, confidence_score
       FROM interview_sessions
       WHERE user_id = $1 AND status = 'completed' AND confidence_score IS NOT NULL
       ORDER BY created_at ASC`,
      [userId]
    );

    // Fill-forward confidence: each interview snapshot persists until the next one
    let currentConfidence: number | null = null;
    let snapIdx = 0;
    const snaps = confidenceResult.rows;

    days.forEach((day) => {
      while (snapIdx < snaps.length && snaps[snapIdx].day <= day.date) {
        currentConfidence = Math.round(parseFloat(snaps[snapIdx].confidence_score) * 100);
        snapIdx++;
      }
      day.confidence = currentConfidence;
    });

    // Summary stats
    const totalActivity = days.reduce((s, d) => s + d.activity, 0);
    const totalGoals = days.reduce((s, d) => s + d.goals, 0);
    const latestConfidence = [...days].reverse().find((d) => d.confidence !== null)?.confidence ?? null;
    const activeDays = days.filter((d) => d.activity > 0).length;

    return NextResponse.json({
      days,
      summary: { totalActivity, totalGoals, latestConfidence, activeDays },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
