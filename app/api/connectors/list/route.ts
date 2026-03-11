export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Pool } from 'pg';
import { ALL_DDL } from '@/app/lib/db/schema';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const ALL_MODELS = ['ollama', 'claude', 'gpt', 'perplexity'] as const;
type ModelName = (typeof ALL_MODELS)[number];

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id as string;

  // Run migrations
  try {
    for (const ddl of ALL_DDL.split(';\n').filter((s) => s.trim())) {
      await pool.query(ddl + ';');
    }
  } catch {
    // Best-effort
  }

  // Query connected models
  let connectorRows: any[] = [];
  try {
    const result = await pool.query(
      `SELECT model_name, api_key, is_active, updated_at FROM connector_tokens WHERE user_id = $1`,
      [userId]
    );
    connectorRows = result.rows;
  } catch {
    // Table may not exist yet; return defaults
  }

  // Query usage stats this month
  const usageByModel: Record<string, { cost: number; queries: number }> = {};
  try {
    const usageResult = await pool.query(
      `SELECT model_name, SUM(cost) as cost_this_month, COUNT(*) as queries
       FROM model_usage_tracking
       WHERE user_id = $1 AND timestamp > date_trunc('month', NOW())
       GROUP BY model_name`,
      [userId]
    );
    for (const row of usageResult.rows) {
      usageByModel[row.model_name] = {
        cost: parseFloat(row.cost_this_month) || 0,
        queries: parseInt(row.queries) || 0,
      };
    }
  } catch {
    // Best-effort
  }

  // Build map from db rows
  const connectorMap: Record<string, any> = {};
  for (const row of connectorRows) {
    connectorMap[row.model_name] = row;
  }

  const response = ALL_MODELS.map((model: ModelName) => {
    const row = connectorMap[model];
    const usage = usageByModel[model] || { cost: 0, queries: 0 };
    const isConnected = row?.is_active === true;
    const apiKey: string = row?.api_key || '';
    const apiKeyPreview = apiKey.length >= 4 ? apiKey.slice(-4) : apiKey.length > 0 ? '****' : null;

    return {
      model,
      isConnected,
      apiKeyPreview,
      costThisMonth: usage.cost,
      queriesThisMonth: usage.queries,
      lastUsed: row?.updated_at || null,
    };
  });

  return NextResponse.json(response);
}
