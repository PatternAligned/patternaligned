require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const app = express();
const PORT = process.env.PORT || 3000;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Middleware
app.use(cors({
  origin: 'https://app.patternaligned.com',
  credentials: true
}));
app.use(express.json());

// Simplified auth - check for user email in header
const getUser = (req, res, next) => {
  const userEmail = req.headers['x-user-email'];
  if (!userEmail) return res.status(401).json({ error: 'No user' });
  req.user = { email: userEmail };
  next();
};

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ============================================================================
// MIGRATION ENDPOINT - Run this ONCE to set up schema
// ============================================================================
app.post('/admin/migrate-schema', async (req, res) => {
  try {
    // Check auth token (optional safety - remove if you want)
    const token = req.headers['x-migration-token'];
    if (token !== process.env.MIGRATION_TOKEN && process.env.MIGRATION_TOKEN) {
      return res.status(403).json({ error: 'Unauthorized migration' });
    }

    console.log('Starting schema migration...');

    // Run the schema SQL
    const schemaSql = `
-- ============================================================================
-- PART 1: NEXTAUTH TABLES (Required for authentication)
-- ============================================================================

-- Users table: Every person who signs up
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT,
  email TEXT UNIQUE NOT NULL,
  email_verified TIMESTAMP WITH TIME ZONE,
  image TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Accounts table: OAuth providers (GitHub, Google, etc.)
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at BIGINT,
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  session_state TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(provider, provider_account_id)
);

-- Sessions table: Active user sessions (managed by NextAuth)
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires TIMESTAMP WITH TIME ZONE NOT NULL,
  session_token TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Verification tokens: Email magic links
CREATE TABLE IF NOT EXISTS verification_tokens (
  identifier TEXT NOT NULL,
  token TEXT NOT NULL,
  expires TIMESTAMP WITH TIME ZONE NOT NULL,
  UNIQUE(identifier, token)
);

-- ============================================================================
-- PART 2: PATTERNALIGNED CORE TABLES
-- ============================================================================

-- Messages: Every conversation message (this is your raw behavioral data)
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  word_count INT,
  token_count INT,
  pause_time_ms INT,
  edit_count INT DEFAULT 0,
  sentiment_score FLOAT,
  model_used TEXT DEFAULT 'claude-sonnet',
  temperature FLOAT DEFAULT 0.7,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Behavioral events: Granular interaction tracking
CREATE TABLE IF NOT EXISTS behavioral_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'message_start',
    'message_pause',
    'message_edit',
    'message_submit',
    'sidebar_open',
    'sidebar_close',
    'model_switch',
    'temperature_change',
    'page_focus',
    'page_blur'
  )),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- User behavioral fingerprints: Aggregated personality patterns
CREATE TABLE IF NOT EXISTS user_behavioral_fingerprints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  fingerprint JSONB DEFAULT '{}'::jsonb,
  message_count INT DEFAULT 0,
  confidence_score FLOAT DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Also create the behavioral_fingerprints alias (for backward compat with existing code)
CREATE TABLE IF NOT EXISTS behavioral_fingerprints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  profile_data JSONB DEFAULT '{}'::jsonb,
  confidence FLOAT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- User activity aggregates: Fast queries for dashboard
CREATE TABLE IF NOT EXISTS user_activity_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_messages INT DEFAULT 0,
  messages_today INT DEFAULT 0,
  messages_this_week INT DEFAULT 0,
  avg_pause_time_ms INT,
  avg_edit_count FLOAT,
  avg_word_count INT,
  last_message_at TIMESTAMP WITH TIME ZONE,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- ============================================================================
-- PART 3: SECURITY (Row Level Security / RLS)
-- ============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE behavioral_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_behavioral_fingerprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE behavioral_fingerprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_stats ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 4: AUTOMATIC UPDATES (Triggers)
-- ============================================================================

CREATE OR REPLACE FUNCTION update_user_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER IF NOT EXISTS user_updated_at_trigger
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_user_updated_at();

CREATE OR REPLACE FUNCTION update_message_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER IF NOT EXISTS message_updated_at_trigger
BEFORE UPDATE ON messages
FOR EACH ROW
EXECUTE FUNCTION update_message_updated_at();

CREATE OR REPLACE FUNCTION update_fingerprint_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER IF NOT EXISTS fingerprint_updated_at_trigger
BEFORE UPDATE ON user_behavioral_fingerprints
FOR EACH ROW
EXECUTE FUNCTION update_fingerprint_updated_at();

CREATE OR REPLACE FUNCTION update_activity_stats_on_message()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_activity_stats (user_id, total_messages, last_message_at)
  VALUES (NEW.user_id, 1, NEW.created_at)
  ON CONFLICT (user_id) DO UPDATE SET
    total_messages = user_activity_stats.total_messages + 1,
    last_message_at = NEW.created_at,
    last_updated = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER IF NOT EXISTS activity_stats_trigger
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION update_activity_stats_on_message();

-- ============================================================================
-- PART 5: PERFORMANCE (Indexes)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_user_created ON messages(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_behavioral_events_user_id ON behavioral_events(user_id);
CREATE INDEX IF NOT EXISTS idx_behavioral_events_event_type ON behavioral_events(event_type);
CREATE INDEX IF NOT EXISTS idx_fingerprints_user_id ON user_behavioral_fingerprints(user_id);
CREATE INDEX IF NOT EXISTS idx_behavioral_fingerprints_user_id ON behavioral_fingerprints(user_id);
    `;

    // Split by statements and execute
    await pool.query(schemaSql);

    console.log('✅ Schema migration complete');
    res.json({
      success: true,
      message: 'Schema created successfully. 4-probe endpoints ready.',
    });
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Chat API
app.post('/api/chat', getUser, async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    const userEmail = req.user.email;

    // Fetch user's behavioral fingerprint
    const fingerprintResult = await pool.query(
      'SELECT profile_data FROM behavioral_fingerprints WHERE user_id = (SELECT id FROM users WHERE email = $1) ORDER BY created_at DESC LIMIT 1',
      [userEmail]
    );
    const fingerprint = fingerprintResult.rows[0]?.profile_data || {};

    // Build system prompt with behavioral injection
    const systemPrompt = `You are Nova, a personalized AI assistant.
User Profile: ${JSON.stringify(fingerprint)}
Respond in a way that matches the user's communication style and preferences.`;

    // Route to Claude
    const Anthropic = require('@anthropic-ai/sdk');
    const client = new Anthropic({
      apiKey: process.env.CLAUDE_API_KEY,
    });

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: message }],
    });

    const assistantMessage = response.content[0].text;
    res.json({ response: assistantMessage });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Export user data
app.get('/api/user/:userEmail/export', getUser, async (req, res) => {
  if (req.user.email !== req.params.userEmail) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  try {
    const chats = await pool.query(
      'SELECT * FROM messages WHERE user_id = (SELECT id FROM users WHERE email = $1) ORDER BY created_at DESC',
      [req.params.userEmail]
    );
    const fingerprint = await pool.query(
      'SELECT * FROM behavioral_fingerprints WHERE user_id = (SELECT id FROM users WHERE email = $1) ORDER BY created_at DESC LIMIT 1',
      [req.params.userEmail]
    );
    res.json({
      chats: chats.rows,
      fingerprint: fingerprint.rows[0] || null,
      exportedAt: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user fingerprint
app.get('/api/user/:userEmail/fingerprint', getUser, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT profile_data, confidence FROM behavioral_fingerprints WHERE user_id = (SELECT id FROM users WHERE email = $1) ORDER BY created_at DESC LIMIT 1',
      [req.params.userEmail]
    );
    res.json(result.rows[0] || { error: 'No fingerprint yet' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4-Probe endpoints
app.post('/behavioral/4-probe', getUser, async (req, res) => {
  try {
    const userEmail = req.user.email;
    const { answers } = req.body;

    // Validate all four probes are present
    if (!answers || !answers.compression || !answers.friction || !answers.execution || !answers.contradiction) {
      return res.status(400).json({
        error: 'Missing required probe answers. Expected: compression, friction, execution, contradiction'
      });
    }

    // Ensure user exists in DB
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [userEmail]
    );

    let userId;
    if (!existingUser.rows[0]) {
      const newUser = await pool.query(
        'INSERT INTO users (email) VALUES ($1) RETURNING id',
        [userEmail]
      );
      userId = newUser.rows[0].id;
    } else {
      userId = existingUser.rows[0].id;
    }

    // Insert 4-probe answers into behavioral_fingerprints
    const result = await pool.query(
      `INSERT INTO behavioral_fingerprints (user_id, profile_data, confidence)
       VALUES ($1, $2, $3)
       RETURNING id, created_at, profile_data`,
      [userId, JSON.stringify(answers), 1.0]
    );

    res.json({
      success: true,
      fingerprintId: result.rows[0].id,
      createdAt: result.rows[0].created_at,
      answers: result.rows[0].profile_data
    });
  } catch (error) {
    console.error('POST /behavioral/4-probe error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/behavioral/4-probe/latest', getUser, async (req, res) => {
  try {
    const userEmail = req.user.email;

    const result = await pool.query(
      `SELECT profile_data, confidence, created_at 
       FROM behavioral_fingerprints 
       WHERE user_id = (SELECT id FROM users WHERE email = $1) 
       ORDER BY created_at DESC LIMIT 1`,
      [userEmail]
    );

    if (!result.rows[0]) {
      return res.json({
        success: false,
        error: 'No 4-probe answers found',
        answers: null
      });
    }

    res.json({
      success: true,
      answers: result.rows[0].profile_data,
      confidence: result.rows[0].confidence,
      createdAt: result.rows[0].created_at
    });
  } catch (error) {
    console.error('GET /behavioral/4-probe/latest error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`PatternAligned API running on port ${PORT}`);
});
