export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Pool } from 'pg';
import { ALL_DDL } from '@/app/lib/db/schema';
import { OllamaConnector } from '@/app/lib/connectors/OllamaConnector';
import { ClaudeConnector } from '@/app/lib/connectors/ClaudeConnector';
import { GPTConnector } from '@/app/lib/connectors/GPTConnector';
import { PerplexityConnector } from '@/app/lib/connectors/PerplexityConnector';
import { ModelConnector } from '@/app/lib/connectors/BaseConnector';

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

  let body: { model?: string; apiKey?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { model, apiKey = '' } = body;

  if (!model || !['ollama', 'claude', 'gpt', 'perplexity'].includes(model)) {
    return NextResponse.json({ error: 'Invalid model name' }, { status: 400 });
  }

  // Run migrations
  try {
    for (const ddl of ALL_DDL.split(';\n').filter((s) => s.trim())) {
      await pool.query(ddl + ';');
    }
  } catch {
    // Migrations are best-effort; table may already exist
  }

  // Ollama: skip key validation
  if (model === 'ollama') {
    try {
      await pool.query(
        `INSERT INTO connector_tokens (user_id, model_name, api_key, is_active, updated_at)
         VALUES ($1, $2, '', true, NOW())
         ON CONFLICT (user_id, model_name)
         DO UPDATE SET api_key = '', is_active = true, updated_at = NOW()`,
        [userId, model]
      );
      return NextResponse.json({ success: true, model, isActive: true });
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Database error' }, { status: 500 });
    }
  }

  // For other models, validate the API key
  if (!apiKey) {
    return NextResponse.json({ error: 'API key is required' }, { status: 400 });
  }

  let connector: ModelConnector;
  if (model === 'claude') connector = new ClaudeConnector();
  else if (model === 'gpt') connector = new GPTConnector();
  else connector = new PerplexityConnector();

  let valid = false;
  try {
    valid = await connector.authenticate(apiKey);
  } catch {
    valid = false;
  }

  if (!valid) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 400 });
  }

  try {
    await pool.query(
      `INSERT INTO connector_tokens (user_id, model_name, api_key, is_active, updated_at)
       VALUES ($1, $2, $3, true, NOW())
       ON CONFLICT (user_id, model_name)
       DO UPDATE SET api_key = $3, is_active = true, updated_at = NOW()`,
      [userId, model, apiKey]
    );
    return NextResponse.json({ success: true, model, isActive: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Database error' }, { status: 500 });
  }
}
