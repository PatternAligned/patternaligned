export const CONNECTOR_TOKENS_DDL = `
CREATE TABLE IF NOT EXISTS connector_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  model_name TEXT NOT NULL CHECK (model_name IN ('ollama','claude','gpt','perplexity')),
  api_key TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, model_name)
);`;

export const USER_MODEL_PREFERENCES_DDL = `
CREATE TABLE IF NOT EXISTS user_model_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE,
  default_model TEXT DEFAULT 'ollama',
  query_type_preferences JSONB DEFAULT '{}',
  model_priority_order JSONB DEFAULT '["ollama","claude","gpt","perplexity"]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);`;

export const MODEL_USAGE_TRACKING_DDL = `
CREATE TABLE IF NOT EXISTS model_usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  project_id UUID,
  model_name TEXT NOT NULL,
  query_type TEXT,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  cost DECIMAL(10,6) DEFAULT 0,
  response_time_ms INTEGER DEFAULT 0,
  success BOOLEAN DEFAULT true,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);`;

export const NOVA_RESPONSES_DDL = `
CREATE TABLE IF NOT EXISTS nova_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID,
  project_id UUID,
  query TEXT,
  model_used TEXT,
  vibe_signal JSONB DEFAULT '{}',
  response_text TEXT,
  response_tokens INTEGER DEFAULT 0,
  user_rating INTEGER CHECK (user_rating BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ DEFAULT NOW()
);`;

export const ALL_DDL = [
  CONNECTOR_TOKENS_DDL,
  USER_MODEL_PREFERENCES_DDL,
  MODEL_USAGE_TRACKING_DDL,
  NOVA_RESPONSES_DDL,
].join('\n');
