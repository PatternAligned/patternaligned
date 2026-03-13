export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Anthropic from '@anthropic-ai/sdk';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function getUserContext(userId: string) {
  try {
    const [prefsResult, gameEventsResult] = await Promise.all([
      pool.query(`SELECT use_cases, goals, tones FROM user_preferences WHERE user_id = $1`, [userId]).catch(() => ({ rows: [] })),
      pool.query(`SELECT metadata FROM behavioral_events WHERE user_id = $1 AND event_type = 'game_event'`, [userId]).catch(() => ({ rows: [] })),
    ]);

    const prefs = prefsResult.rows[0] || null;

    const gameObservations: Record<string, string> = {};
    gameEventsResult.rows.forEach((row: any) => {
      const meta = row.metadata || {};
      const game = meta.game;
      if (game === 'problem_approach' && meta.approach_style) gameObservations.problem_approach = meta.approach_style;
      if (game === 'pace_rhythm' && meta.pace_preference) gameObservations.work_pace = meta.pace_preference;
      if (game === 'communication_mirror' && meta.communication_style) gameObservations.communication_mode = meta.communication_style;
      if (game === 'risk_openness' && meta.risk_tolerance) gameObservations.risk_posture = meta.risk_tolerance;
      if (game === 'energy_mood_state' && meta.energy_pattern) gameObservations.energy_pattern = meta.energy_pattern;
      if (game === 'curiosity_vector' && meta.topic_choice) gameObservations.curiosity_vector = meta.topic_choice;
    });

    return { prefs, gameObservations };
  } catch {
    return { prefs: null, gameObservations: {} };
  }
}

function buildSystemPrompt(novaName: string, userContext?: { prefs: any; gameObservations: Record<string, string> }): string {
  const name = novaName?.trim() || 'Nova';
  return `You are ${name}, conducting a behavioral interview to understand how this person thinks and works. Your name is ${name} — use it naturally if you reference yourself.

Your job is to extract signal on 4 dimensions:
1. COMPRESSION: How they prefer information — dense/compact vs. spacious/explained
2. FRICTION: How they handle obstacles — navigate around vs. push through
3. EXECUTION: Their action style — rapid ("ship now, refine later") vs. deliberate planning
4. CONTRADICTION: Tolerance for ambiguity — sit with open questions vs. resolve them

RULES:
- Ask ONE question at a time. Never more.
- Natural and conversational, not clinical.
- Adapt based on what they said — show you're listening.
- Probe deeper if they're vague.
- After 5-8 exchanges you'll have enough signal.
- Never label them out loud — just ask questions that reveal the pattern.

OPENING (when history is empty — first message):
"Great. Let's talk about how you actually work. I'll ask some questions to understand your patterns better. When you're working on something and hit a wall — what's your first instinct?"

At the END of every response, append this signal block (stripped before display):
<SIGNALS>
{
  "compression": "dense" | "sparse" | null,
  "friction": "navigate" | "push" | null,
  "execution": "rapid" | "deliberate" | null,
  "contradiction": "hold" | "resolve" | null,
  "probesCompleted": [],
  "confidence": 0,
  "shouldShowContinue": false
}
</SIGNALS>

Set confidence 0-100. Set shouldShowContinue=true when confidence >= 72.
Only include a dimension in probesCompleted when you have clear signal on it.${userContext?.prefs ? `\nUSER CONTEXT:\n- Goals: ${userContext.prefs.goals || 'not specified'}\n- Communication style: ${(userContext.prefs.tones || []).join(', ') || 'not specified'}\n- Use cases: ${(userContext.prefs.use_cases || []).join(', ') || 'not specified'}` : ''}
${Object.keys(userContext?.gameObservations || {}).length > 0 ? `\nGAME OBSERVATIONS (actual behavior, not stated):\n${Object.entries(userContext!.gameObservations).map(([k, v]) => `- ${k}: ${v}`).join('\n')}` : ''}`;
}

function parseSignals(raw: string): {
  cleanText: string;
  signals: {
    compression: string | null;
    friction: string | null;
    execution: string | null;
    contradiction: string | null;
    probesCompleted: string[];
    confidence: number;
    shouldShowContinue: boolean;
  };
} {
  const defaults = {
    compression: null,
    friction: null,
    execution: null,
    contradiction: null,
    probesCompleted: [] as string[],
    confidence: 0,
    shouldShowContinue: false,
  };

  const match = raw.match(/<SIGNALS>([\s\S]*?)<\/SIGNALS>/);
  const cleanText = raw.replace(/<SIGNALS>[\s\S]*?<\/SIGNALS>/g, '').trim();

  if (!match) return { cleanText, signals: defaults };
  try {
    const parsed = JSON.parse(match[1].trim());
    return { cleanText, signals: { ...defaults, ...parsed } };
  } catch {
    return { cleanText, signals: defaults };
  }
}

async function ensureTables() {
  // Create interview_sessions if not exists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS interview_sessions (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      session_id TEXT,
      status TEXT DEFAULT 'in_progress',
      claude_insights JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Migrate: add columns that may be missing in older schemas
  await pool.query(`ALTER TABLE interview_sessions ADD COLUMN IF NOT EXISTS session_id TEXT`).catch(() => {});
  await pool.query(`ALTER TABLE interview_sessions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()`).catch(() => {});

  // Create cognitive_baselines if not exists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS cognitive_baselines (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      baseline_version INTEGER DEFAULT 1,
      directness_pct INTEGER DEFAULT 0,
      sarcasm_pct INTEGER DEFAULT 0,
      execution_pct INTEGER DEFAULT 0,
      friction_tolerance_pct INTEGER DEFAULT 0,
      collaboration_pct INTEGER DEFAULT 0,
      contradiction_acceptance_pct INTEGER DEFAULT 0,
      created_from_interview_at TIMESTAMPTZ
    )
  `).catch(() => {});
}

async function upsertSession(userId: string, sessionId: string, status: string, insights: object) {
  const existing = await pool.query(
    `SELECT id FROM interview_sessions WHERE session_id = $1 AND user_id = $2`,
    [sessionId, userId]
  );

  if (existing.rows.length) {
    await pool.query(
      `UPDATE interview_sessions SET status = $1, claude_insights = $2, updated_at = NOW()
       WHERE session_id = $3 AND user_id = $4`,
      [status, JSON.stringify(insights), sessionId, userId]
    );
  } else {
    await pool.query(
      `INSERT INTO interview_sessions (user_id, session_id, status, claude_insights)
       VALUES ($1, $2, $3, $4)`,
      [userId, sessionId, status, JSON.stringify(insights)]
    );
  }
}

async function writeBaselines(
  userId: string,
  signals: { compression: string | null; friction: string | null; execution: string | null; contradiction: string | null },
  confidence: number
) {
  const c = confidence;
  const directness_pct = signals.compression ? Math.min(95, Math.round(c * 0.9)) : Math.min(50, Math.round(c * 0.45));
  const execution_pct = signals.execution ? Math.min(95, Math.round(c * 0.95)) : Math.min(50, Math.round(c * 0.45));
  const friction_tolerance_pct = signals.friction ? Math.min(95, Math.round(c * 0.9)) : Math.min(50, Math.round(c * 0.45));
  const collaboration_pct = Math.min(65, Math.round(c * 0.6));
  const contradiction_acceptance_pct = signals.contradiction ? Math.min(95, Math.round(c * 0.85)) : Math.min(50, Math.round(c * 0.45));
  const sarcasm_pct = Math.min(40, Math.round(c * 0.3));

  await pool.query(
    `INSERT INTO cognitive_baselines
       (user_id, baseline_version, directness_pct, sarcasm_pct, execution_pct,
        friction_tolerance_pct, collaboration_pct, contradiction_acceptance_pct, created_from_interview_at)
     VALUES ($1, 1, $2, $3, $4, $5, $6, $7, NOW())
     ON CONFLICT (user_id) DO UPDATE SET
       directness_pct = $2,
       sarcasm_pct = $3,
       execution_pct = $4,
       friction_tolerance_pct = $5,
       collaboration_pct = $6,
       contradiction_acceptance_pct = $7,
       baseline_version = cognitive_baselines.baseline_version + 1,
       created_from_interview_at = NOW()`,
    [userId, directness_pct, sarcasm_pct, execution_pct, friction_tolerance_pct, collaboration_pct, contradiction_acceptance_pct]
  );
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any)?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;

    const { message, history = [], session_id, nova_name } = await request.json();
    if (!message) return NextResponse.json({ error: 'message required' }, { status: 400 });

    // ensureTables is best-effort — table likely already exists from Render migration
    await ensureTables().catch((e) => console.error('ensureTables failed (non-blocking):', e.message));

    const userContext = await getUserContext(userId).catch(() => ({ prefs: null, gameObservations: {} }));

    const chatSessionId = session_id || `interview-${userId}-${Date.now()}`;
    const systemPrompt = buildSystemPrompt(nova_name || 'Nova', userContext);

    const messages: Anthropic.MessageParam[] = [
      ...history.map((h: { role: string; content: string }) => ({
        role: h.role as 'user' | 'assistant',
        content: h.content,
      })),
      { role: 'user', content: message },
    ];

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      system: systemPrompt,
      messages,
    });

    const rawText = response.content[0].type === 'text' ? response.content[0].text : '';
    const { cleanText, signals } = parseSignals(rawText);

    const confidence = signals.confidence;
    const shouldShowContinue = signals.shouldShowContinue;
    const status = shouldShowContinue ? 'completed' : 'in_progress';

    let overallSummary: string | null = null;

    if (shouldShowContinue) {
      try {
        const summaryRes = await anthropic.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 250,
          system: 'Synthesize behavioral interview patterns into a 2-3 sentence work style narrative. Be specific — reference what was actually said. Write in third person about "this person". No generic phrases.',
          messages: [
            ...messages,
            { role: 'assistant', content: cleanText },
            { role: 'user', content: 'Write a 2-3 sentence work style summary based on everything discussed.' },
          ],
        });
        overallSummary = summaryRes.content[0].type === 'text' ? summaryRes.content[0].text : null;
      } catch (e) {
        console.error('Summary generation failed:', e);
      }
    }

    const confidenceScores = {
      directness: signals.compression ? Math.min(95, Math.round(confidence * 0.9)) : Math.min(50, Math.round(confidence * 0.45)),
      execution: signals.execution ? Math.min(95, Math.round(confidence * 0.95)) : Math.min(50, Math.round(confidence * 0.45)),
      friction_tolerance: signals.friction ? Math.min(95, Math.round(confidence * 0.9)) : Math.min(50, Math.round(confidence * 0.45)),
      collaboration: Math.min(65, Math.round(confidence * 0.6)),
      contradiction_acceptance: signals.contradiction ? Math.min(95, Math.round(confidence * 0.85)) : Math.min(50, Math.round(confidence * 0.45)),
      cognitive_load: signals.compression ? Math.min(90, Math.round(confidence * 0.8)) : Math.min(45, Math.round(confidence * 0.4)),
    };

    const insights = {
      compression_profile: signals.compression ? { preference: signals.compression, description: '' } : null,
      friction_profile: signals.friction ? { preference: signals.friction, description: '' } : null,
      execution_profile: signals.execution ? { preference: signals.execution, description: '' } : null,
      contradiction_profile: signals.contradiction ? { preference: signals.contradiction, description: '' } : null,
      overall_summary: overallSummary,
      confidence_score: confidence / 100,
      confidence_scores: confidenceScores,
      probes_completed: signals.probesCompleted,
    };

    await upsertSession(userId, chatSessionId, status, insights).catch((e) => console.error('upsertSession failed (non-blocking):', e.message));

    // Write to cognitive_baselines when interview is complete
    if (shouldShowContinue) {
      await writeBaselines(userId, signals, confidence).catch((e) => {
        console.error('Failed to write cognitive baselines:', e);
      });
    }

    return NextResponse.json({
      message: cleanText,
      session_id: chatSessionId,
      confidence,
      shouldShowContinue,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : '';
    console.error('Interview chat error:', msg, stack);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
