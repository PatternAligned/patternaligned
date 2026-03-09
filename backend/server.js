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
// Chat API
app.post('/api/chat', getUser, async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    const userEmail = req.user.email;
    // Ensure user exists in Render DB
   
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
      model:'claude-sonnet-4-5',
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

    // Ensure user exists in DB (fixes GitHub OAuth persistence issue)
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [userEmail]
    );

    let userId;
    if (!existingUser.rows[0]) {
      // User doesn't exist, create them
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
