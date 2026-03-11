import { Pool } from 'pg';
import { randomUUID } from 'crypto';
import { OllamaConnector } from '../connectors/OllamaConnector';
import { ClaudeConnector } from '../connectors/ClaudeConnector';
import { GPTConnector } from '../connectors/GPTConnector';
import { PerplexityConnector } from '../connectors/PerplexityConnector';
import { ModelConnector } from '../connectors/BaseConnector';
import { buildBehavioralPrompt } from './BehavioralPromptBuilder';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Singleton connector instances per user (keyed by userId:model)
const connectorCache = new Map<string, ModelConnector>();

export type QueryType = 'code' | 'research' | 'strategy' | 'general' | 'writing' | 'analysis';
export type ModelName = 'ollama' | 'claude' | 'gpt' | 'perplexity';

export function analyzeQueryType(query: string): QueryType {
  const q = query.toLowerCase();
  if (/\b(research|investigate|current|news|latest|source|citation|fact)\b/.test(q)) return 'research';
  if (/\b(function|class|bug|error|debug|code|implement|syntax|algorithm|typescript|javascript|python|sql)\b/.test(q)) return 'code';
  if (/\b(strategy|plan|roadmap|prioritize|decision|goal|vision|market|competitor)\b/.test(q)) return 'strategy';
  if (/\b(write|draft|copy|email|blog|paragraph|essay|tone|voice)\b/.test(q)) return 'writing';
  if (/\b(analyze|data|metric|trend|chart|compare|measure|performance)\b/.test(q)) return 'analysis';
  return 'general';
}

export async function getConnectedModels(userId: string): Promise<ModelName[]> {
  try {
    const result = await pool.query(
      `SELECT model_name FROM connector_tokens WHERE user_id = $1 AND is_active = true`,
      [userId]
    );
    const models = result.rows.map((r: any) => r.model_name as ModelName);
    // Always include ollama if OLLAMA_BASE_URL is set (self-hosted, no token needed)
    if (process.env.OLLAMA_BASE_URL && !models.includes('ollama')) {
      models.unshift('ollama');
    }
    return models;
  } catch {
    return process.env.OLLAMA_BASE_URL ? ['ollama'] : [];
  }
}

export async function getConnector(userId: string, model: ModelName): Promise<ModelConnector | null> {
  const cacheKey = `${userId}:${model}`;
  if (connectorCache.has(cacheKey)) return connectorCache.get(cacheKey)!;

  if (model === 'ollama') {
    const c = new OllamaConnector();
    await c.authenticate('');
    connectorCache.set(cacheKey, c);
    return c;
  }

  try {
    const result = await pool.query(
      `SELECT api_key FROM connector_tokens WHERE user_id = $1 AND model_name = $2 AND is_active = true`,
      [userId, model]
    );
    if (!result.rows[0]) return null;

    let connector: ModelConnector;
    if (model === 'claude') connector = new ClaudeConnector();
    else if (model === 'gpt') connector = new GPTConnector();
    else connector = new PerplexityConnector();

    await connector.authenticate(result.rows[0].api_key);
    connectorCache.set(cacheKey, connector);
    return connector;
  } catch {
    return null;
  }
}

export async function routeQuery(query: string, userId: string): Promise<ModelName> {
  const queryType = analyzeQueryType(query);

  // Load user preferences
  let userPrefs: any = null;
  try {
    const r = await pool.query(`SELECT * FROM user_model_preferences WHERE user_id = $1`, [userId]);
    userPrefs = r.rows[0] || null;
  } catch {}

  const connectedModels = await getConnectedModels(userId);

  // Check learned preference for this query type
  const learnedModel = userPrefs?.query_type_preferences?.[queryType] as ModelName | undefined;
  if (learnedModel && connectedModels.includes(learnedModel)) return learnedModel;

  // Check default model
  const defaultModel = userPrefs?.default_model as ModelName | undefined;
  if (defaultModel && connectedModels.includes(defaultModel)) return defaultModel;

  // Fallbacks in priority order
  const fallbacks: ModelName[] = ['ollama', 'claude', 'gpt', 'perplexity'];
  for (const m of fallbacks) {
    if (connectedModels.includes(m)) return m;
  }

  return 'claude'; // final fallback
}

export async function executeQuery(params: {
  query: string;
  model: ModelName;
  userId: string;
  projectId?: string;
  systemPromptBase: string;
  vibeSignal?: any;
  userPrefs?: any;
}): Promise<{
  text: string;
  modelUsed: ModelName;
  tokens: { input: number; output: number };
  cost: number;
  latency: number;
  citations?: string[];
  responseId: string;
}> {
  const { query, model, userId, projectId, systemPromptBase, vibeSignal, userPrefs } = params;
  const connector = await getConnector(userId, model);
  if (!connector) throw new Error(`Model ${model} not connected`);

  const behavioralAddition = buildBehavioralPrompt(vibeSignal, userPrefs);
  const systemPrompt = behavioralAddition
    ? `${systemPromptBase}\n\n${behavioralAddition}`
    : systemPromptBase;

  const start = Date.now();
  const response = await connector.query(query, systemPrompt);
  const latency = Date.now() - start;

  const cost = connector.costPerToken(response.tokens.input, response.tokens.output);
  const responseId = randomUUID();

  // Log usage (best effort)
  const queryType = analyzeQueryType(query);
  pool
    .query(
      `INSERT INTO model_usage_tracking (id, user_id, project_id, model_name, query_type, input_tokens, output_tokens, cost, response_time_ms, success, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, NOW())`,
      [
        responseId,
        userId,
        projectId || null,
        model,
        queryType,
        response.tokens.input,
        response.tokens.output,
        cost,
        latency,
      ]
    )
    .catch(() => {});

  // Log to nova_responses (best effort)
  pool
    .query(
      `INSERT INTO nova_responses (id, project_id, query, model_used, vibe_signal, response_text, response_tokens, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [
        responseId,
        projectId || null,
        query,
        model,
        JSON.stringify(vibeSignal || {}),
        response.text,
        response.tokens.output,
      ]
    )
    .catch(() => {});

  return {
    text: response.text,
    modelUsed: model,
    tokens: response.tokens,
    cost,
    latency,
    citations: response.citations,
    responseId,
  };
}
