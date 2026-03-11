export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Pool } from 'pg';
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

  let body: { model?: string; testPrompt?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { model, testPrompt = 'Hello, respond in one sentence.' } = body;

  if (!model || !['ollama', 'claude', 'gpt', 'perplexity'].includes(model)) {
    return NextResponse.json({ error: 'Invalid model name' }, { status: 400 });
  }

  let apiKey = '';

  if (model !== 'ollama') {
    try {
      const result = await pool.query(
        `SELECT api_key FROM connector_tokens WHERE user_id = $1 AND model_name = $2 AND is_active = true`,
        [userId, model]
      );
      if (!result.rows[0]) {
        return NextResponse.json({ error: 'Model not connected' }, { status: 404 });
      }
      apiKey = result.rows[0].api_key;
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Database error' }, { status: 500 });
    }
  }

  let connector: ModelConnector;
  if (model === 'ollama') connector = new OllamaConnector();
  else if (model === 'claude') connector = new ClaudeConnector();
  else if (model === 'gpt') connector = new GPTConnector();
  else connector = new PerplexityConnector();

  try {
    await connector.authenticate(apiKey);
  } catch {
    return NextResponse.json({ error: 'Authentication failed' }, { status: 400 });
  }

  const start = Date.now();
  try {
    const response = await connector.query(testPrompt, 'You are a helpful assistant.');
    const latency = Date.now() - start;
    const cost = connector.costPerToken(response.tokens.input, response.tokens.output);

    return NextResponse.json({
      success: true,
      responsePreview: response.text.slice(0, 200),
      latency,
      cost,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Query failed' }, { status: 500 });
  }
}
