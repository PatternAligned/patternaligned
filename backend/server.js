require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Middleware
app.use(cors({
  origin: 'https://patternaligned-six.vercel.app',
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
      model: 'claude-3-5-sonnet-20241022',
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
      'SELECT * FROM chat_messages WHERE user_id = (SELECT id FROM users WHERE email = $1) ORDER BY created_at DESC',
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

// Start server
app.listen(PORT, () => {
  console.log(`PatternAligned API running on port ${PORT}`);
});