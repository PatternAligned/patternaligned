export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Pool } from 'pg';
import { MODEL_USAGE_TRACKING_DDL } from '@/app/lib/db/schema';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id as string;

  // Run migration
  try {
    await pool.query(MODEL_USAGE_TRACKING_DDL);
  } catch {
    // Best-effort
  }

  try {
    // Overall totals
    const totalsResult = await pool.query(
      `SELECT
         SUM(cost) as total_cost,
         COUNT(*) as total_queries,
         AVG(response_time_ms) as avg_latency
       FROM model_usage_tracking
       WHERE user_id = $1`,
      [userId]
    );

    // Cost by model
    const byModelResult = await pool.query(
      `SELECT model_name, SUM(cost) as cost, COUNT(*) as queries
       FROM model_usage_tracking
       WHERE user_id = $1
       GROUP BY model_name`,
      [userId]
    );

    // Top model (most queries)
    const topModelResult = await pool.query(
      `SELECT model_name, COUNT(*) as queries
       FROM model_usage_tracking
       WHERE user_id = $1
       GROUP BY model_name
       ORDER BY queries DESC
       LIMIT 1`,
      [userId]
    );

    // Cost this month
    const monthlyResult = await pool.query(
      `SELECT SUM(cost) as cost_this_month, COUNT(*) as queries_this_month
       FROM model_usage_tracking
       WHERE user_id = $1 AND timestamp > date_trunc('month', NOW())`,
      [userId]
    );

    // Queries last 30 days (daily breakdown for chart)
    const dailyResult = await pool.query(
      `SELECT
         DATE(timestamp) as date,
         COUNT(*) as queries,
         SUM(cost) as cost
       FROM model_usage_tracking
       WHERE user_id = $1 AND timestamp > NOW() - INTERVAL '30 days'
       GROUP BY DATE(timestamp)
       ORDER BY date ASC`,
      [userId]
    );

    const totals = totalsResult.rows[0];
    const monthly = monthlyResult.rows[0];

    const costByModel: Record<string, { cost: number; queries: number }> = {};
    for (const row of byModelResult.rows) {
      costByModel[row.model_name] = {
        cost: parseFloat(row.cost) || 0,
        queries: parseInt(row.queries) || 0,
      };
    }

    return NextResponse.json({
      totalCost: parseFloat(totals?.total_cost) || 0,
      totalQueries: parseInt(totals?.total_queries) || 0,
      avgLatency: parseFloat(totals?.avg_latency) || 0,
      costByModel,
      topModel: topModelResult.rows[0]?.model_name || null,
      costThisMonth: parseFloat(monthly?.cost_this_month) || 0,
      queriesThisMonth: parseInt(monthly?.queries_this_month) || 0,
      queriesLast30Days: dailyResult.rows.map((row) => ({
        date: row.date,
        queries: parseInt(row.queries) || 0,
        cost: parseFloat(row.cost) || 0,
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Database error' }, { status: 500 });
  }
}
