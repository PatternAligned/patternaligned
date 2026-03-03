require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Middleware
app.use(cors());
app.use(express.json());

// JWT verification middleware
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Chat API
app.post('/api/chat', verifyToken, async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    const userId = req.user.id;

    // Fetch user's behavioral fingerprint
    const fingerprintResult = await pool.query(
      'SELECT profile_data FROM behavioral_fingerprints WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [userId]
    );
    
    const fingerprint = fingerprintResult.rows[0]?.profile_data || {};

    // Build system prompt with behavioral injection
    const systemPrompt = `You are Nova, a personalized AI assistant.
User Profile: ${JSON.stringify(fingerprint)}
Respond in a way that matches the user's communication style and preferences.`;

    // Route to Claude (production - use GPT/Ollama as needed)
    const Anthropic = require('@anthropic-ai/sdk');
    const client = new Anthropic({
      apiKey: process.env.CLAUDE_API_KEY,
    });

    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: message }],
    });

    const assistantMessage = response.content[0].text;

    // Store in database
    await pool.query(
      'INSERT INTO chat_messages (session_id, user_id, content, role, model_used, tokens) VALUES ($1, $2, $3, $4, $5, $6)',
      [sessionId, userId, message, 'user', 'user-input', 0]
    );

    await pool.query(
      'INSERT INTO chat_messages (session_id, user_id, content, role, model_used, tokens) VALUES ($1, $2, $3, $4, $5, $6)',
      [sessionId, userId, assistantMessage, 'assistant', 'claude-3-5-sonnet', response.usage.output_tokens]
    );

    // Log analytics
    await pool.query(
      'INSERT INTO analytics (user_id, event_type, data) VALUES ($1, $2, $3)',
      [userId, 'chat_message', JSON.stringify({ model: 'claude', tokens: response.usage.output_tokens })]
    );

    res.json({ response: assistantMessage });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Export user data
app.get('/api/user/:userId/export', verifyToken, async (req, res) => {
  if (req.user.id !== req.params.userId) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  try {
    const chats = await pool.query(
      'SELECT * FROM chat_messages WHERE user_id = $1 ORDER BY created_at DESC',
      [req.params.userId]
    );
    
    const fingerprint = await pool.query(
      'SELECT * FROM behavioral_fingerprints WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [req.params.userId]
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
app.get('/api/user/:userId/fingerprint', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT profile_data, confidence FROM behavioral_fingerprints WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [req.params.userId]
    );
    res.json(result.rows[0] || { error: 'No fingerprint yet' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`PatternAligned API running on port ${PORT}`);
});