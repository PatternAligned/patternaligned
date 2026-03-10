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
  const client = await pool.connect();
  try {
    console.log('Starting schema migration...');

    // Execute statements one by one
    const statements = [
      // Users table
      `CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT,
        email TEXT UNIQUE NOT NULL,
        email_verified TIMESTAMP WITH TIME ZONE,
        image TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
      )`,

      // Accounts table
      `CREATE TABLE IF NOT EXISTS accounts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
      )`,

      // Sessions table
      `CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires TIMESTAMP WITH TIME ZONE NOT NULL,
        session_token TEXT UNIQUE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
      )`,

      // Verification tokens
      `CREATE TABLE IF NOT EXISTS verification_tokens (
        identifier TEXT NOT NULL,
        token TEXT NOT NULL,
        expires TIMESTAMP WITH TIME ZONE NOT NULL,
        UNIQUE(identifier, token)
      )`,

      // Messages table
      `CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
      )`,

      // Behavioral events
      `CREATE TABLE IF NOT EXISTS behavioral_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
        event_type TEXT NOT NULL,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
      )`,

      // User behavioral fingerprints
      `CREATE TABLE IF NOT EXISTS user_behavioral_fingerprints (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        fingerprint JSONB DEFAULT '{}'::jsonb,
        message_count INT DEFAULT 0,
        confidence_score FLOAT DEFAULT 0,
        last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
      )`,

      // Behavioral fingerprints (for existing endpoints)
      `CREATE TABLE IF NOT EXISTS behavioral_fingerprints (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        profile_data JSONB DEFAULT '{}'::jsonb,
        confidence FLOAT DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
      )`,

      // User activity stats
      `CREATE TABLE IF NOT EXISTS user_activity_stats (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
      )`,

      // Indexes
      'CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC)',
      'CREATE INDEX IF NOT EXISTS idx_messages_user_created ON messages(user_id, created_at DESC)',
      'CREATE INDEX IF NOT EXISTS idx_behavioral_events_user_id ON behavioral_events(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_fingerprints_user_id ON user_behavioral_fingerprints(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_behavioral_fingerprints_user_id ON behavioral_fingerprints(user_id)',

      `CREATE TABLE IF NOT EXISTS interview_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        probe_index INT DEFAULT 0,
        answers JSONB DEFAULT '{}'::jsonb,
        status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
        claude_insights JSONB,
        confidence_score FLOAT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
      )`,

      'CREATE INDEX IF NOT EXISTS idx_interview_sessions_user_id ON interview_sessions(user_id)',

      // Fix existing interview_sessions table if created with uuid_generate_v4()
      'ALTER TABLE interview_sessions ALTER COLUMN id SET DEFAULT gen_random_uuid()',

      // Add missing columns to interview_sessions if they don't exist
      `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_sessions' AND column_name='probe_index') THEN
          ALTER TABLE interview_sessions ADD COLUMN probe_index INT DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_sessions' AND column_name='answers') THEN
          ALTER TABLE interview_sessions ADD COLUMN answers JSONB DEFAULT '{}'::jsonb;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_sessions' AND column_name='status') THEN
          ALTER TABLE interview_sessions ADD COLUMN status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed'));
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_sessions' AND column_name='claude_insights') THEN
          ALTER TABLE interview_sessions ADD COLUMN claude_insights JSONB;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_sessions' AND column_name='confidence_score') THEN
          ALTER TABLE interview_sessions ADD COLUMN confidence_score FLOAT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_sessions' AND column_name='updated_at') THEN
          ALTER TABLE interview_sessions ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();
        END IF;
      END $$`,
    ];

    for (const statement of statements) {
      try {
        await client.query(statement);
      } catch (err) {
        // Skip if table/index already exists
        if (!err.message.includes('already exists')) {
          console.error(`Error executing: ${statement.substring(0, 50)}...`, err);
          throw err;
        }
      }
    }

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
  } finally {
    client.release();
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

// ============================================================================
// BEHAVIORAL INTERVIEW ENDPOINTS
// ============================================================================

const INTERVIEW_PROBES = [
  {
    id: 'compression',
    question: 'How do you prefer to receive information? Do you like detailed, layered explanations with full context, or do you prefer concise, direct answers that cut to the point?',
  },
  {
    id: 'friction',
    question: 'When you hit a wall or obstacle — whether in work, learning, or problem-solving — what\'s your instinct? Do you push through it directly, or do you look for ways around it?',
  },
  {
    id: 'execution',
    question: 'Once you have an idea you believe in, how do you typically move forward? Do you dive in and figure it out as you go, or do you plan and validate before acting?',
  },
  {
    id: 'contradiction',
    question: 'When you encounter two conflicting pieces of information that both seem valid, what do you tend to do — try to resolve it and find which is true, or hold both as possibilities and sit with the tension?',
  },
];

app.post('/behavioral/interview/start', getUser, async (req, res) => {
  try {
    const userEmail = req.user.email;

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [userEmail]);
    let userId;
    if (existing.rows[0]) {
      userId = existing.rows[0].id;
    } else {
      const newUser = await pool.query('INSERT INTO users (email) VALUES ($1) RETURNING id', [userEmail]);
      userId = newUser.rows[0].id;
    }

    const result = await pool.query(
      `INSERT INTO interview_sessions (user_id, probe_index, answers, status)
       VALUES ($1, 0, '{}'::jsonb, 'in_progress')
       RETURNING id`,
      [userId]
    );

    const sessionId = result.rows[0].id;
    const firstProbe = INTERVIEW_PROBES[0];

    res.json({
      sessionId,
      probe: firstProbe.id,
      question: firstProbe.question,
    });
  } catch (error) {
    console.error('Interview start error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/behavioral/interview/answer', getUser, async (req, res) => {
  const { sessionId, answer } = req.body;

  if (!sessionId || !answer) {
    return res.status(400).json({ error: 'sessionId and answer are required' });
  }

  try {
    const sessionResult = await pool.query(
      `SELECT probe_index, answers FROM interview_sessions WHERE id = $1 AND status = 'in_progress'`,
      [sessionId]
    );

    if (!sessionResult.rows[0]) {
      return res.status(404).json({ error: 'Session not found or already completed' });
    }

    const { probe_index, answers } = sessionResult.rows[0];
    const currentProbe = INTERVIEW_PROBES[probe_index];
    const updatedAnswers = { ...answers, [currentProbe.id]: answer };
    const nextIndex = probe_index + 1;

    await pool.query(
      `UPDATE interview_sessions
       SET probe_index = $1, answers = $2, updated_at = now()
       WHERE id = $3`,
      [nextIndex, JSON.stringify(updatedAnswers), sessionId]
    );

    const nextProbe = INTERVIEW_PROBES[nextIndex];
    if (!nextProbe) {
      return res.json({ isComplete: true });
    }

    res.json({
      isComplete: false,
      nextProbe: nextProbe.id,
      nextQuestion: nextProbe.question,
    });
  } catch (error) {
    console.error('Interview answer error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/behavioral/interview/complete', getUser, async (req, res) => {
  const { sessionId } = req.body;

  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId is required' });
  }

  try {
    const sessionResult = await pool.query(
      `SELECT answers FROM interview_sessions WHERE id = $1`,
      [sessionId]
    );

    if (!sessionResult.rows[0]) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const answers = sessionResult.rows[0].answers;

    const Anthropic = require('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });

    const prompt = `You are analyzing a user's cognitive and behavioral preferences based on their interview answers.

Answers:
- Compression (information processing): "${answers.compression}"
- Friction (obstacle response): "${answers.friction}"
- Execution (idea to action): "${answers.execution}"
- Contradiction (handling conflict): "${answers.contradiction}"

Return a JSON object with this exact structure (no markdown, raw JSON only):
{
  "overall_summary": "2-3 sentence description of this person's cognitive style",
  "confidence_score": 0.85,
  "compression_profile": { "preference": "dense|sparse", "description": "one sentence" },
  "friction_profile": { "preference": "push|navigate", "description": "one sentence" },
  "execution_profile": { "preference": "rapid|deliberate", "description": "one sentence" },
  "contradiction_profile": { "preference": "resolve|hold", "description": "one sentence" }
}`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = response.content[0].text.replace(/^```(?:json)?\n?|```$/g, '').trim();
    const claudeInsights = JSON.parse(raw);

    await pool.query(
      `UPDATE interview_sessions
       SET status = 'completed', claude_insights = $1, confidence_score = $2, updated_at = now()
       WHERE id = $3`,
      [JSON.stringify(claudeInsights), claudeInsights.confidence_score, sessionId]
    );

    res.json({ success: true, claudeInsights });
  } catch (error) {
    console.error('Interview complete error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`PatternAligned API running on port ${PORT}`);
});
