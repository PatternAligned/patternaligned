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

const INTERVIEW_SYSTEM_PROMPT = `You are Nova, conducting a behavioral interview to understand how this person thinks and works. Your job is to extract signal on 4 dimensions:

1. COMPRESSION: How they prefer information — dense and compact vs. spacious and explained
2. FRICTION: How they handle obstacles — navigate around them or push through directly
3. EXECUTION: Their action style — rapid iteration ("do it now, refine later") vs. deliberate planning
4. CONTRADICTION: Their tolerance for ambiguity — sit with open questions vs. resolve them quickly

RULES:
- Ask ONE question at a time. Never more.
- Questions should feel natural and conversational, not clinical or diagnostic.
- Adapt based on what they just said — show you're listening.
- If they give a vague answer, probe deeper with a follow-up.
- After 5-8 exchanges you will have enough signal.
- Do NOT label or categorize out loud — just ask questions that reveal the pattern.

OPENING LINE (first message only, when history is empty):
"Great. Let's talk about how you actually work. I'll ask some questions to understand your patterns better. When you're working on something and hit a wall — what's your first instinct?"

For subsequent messages, ask the next most revealing follow-up based on what they said.

At the very end of EVERY response, append a signal block in this exact format — it will be stripped before display:
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

Set confidence 0–100 based on how much clear signal you have. Set shouldShowContinue=true when confidence >= 72.
Only include a dimension in probesCompleted when you have clear signal on it.`;

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

async function ensureTable() {
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
}

async function upsertSession(
  userId: string,
  sessionId: string,
  status: string,
  insights: object
) {
  const existing = await pool.query(
    `SELECT id FROM interview_sessions WHERE session_id = $1 AND user_id = $2`,
    [sessionId, userId]
  );

  if (existing.rows.length) {
    await pool.query(
      `UPDATE interview_sessions
       SET status = $1, claude_insights = $2, updated_at = NOW()
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

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any)?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;

    const { message, history = [], session_id } = await request.json();
    if (!message) return NextResponse.json({ error: 'message required' }, { status: 400 });

    await ensureTable();

    const chatSessionId = session_id || `interview-${userId}-${Date.now()}`;

    // Build message array
    const messages: Anthropic.MessageParam[] = [
      ...history.map((h: { role: string; content: string }) => ({
        role: h.role as 'user' | 'assistant',
        content: h.content,
      })),
      { role: 'user', content: message },
    ];

    // Get Nova's response
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      system: INTERVIEW_SYSTEM_PROMPT,
      messages,
    });

    const rawText = response.content[0].type === 'text' ? response.content[0].text : '';
    const { cleanText, signals } = parseSignals(rawText);

    const confidence = signals.confidence;
    const shouldShowContinue = signals.shouldShowContinue;
    const status = shouldShowContinue ? 'completed' : 'in_progress';

    // Build insights payload
    let overallSummary: string | null = null;

    // If we have enough signal, generate a work style summary
    if (shouldShowContinue) {
      try {
        const summaryRes = await anthropic.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 250,
          system:
            'You synthesize behavioral interview patterns into a 2-3 sentence work style narrative. Be specific, reference what was actually said, not generic. Write in third person about "this person".',
          messages: [
            ...messages,
            { role: 'assistant', content: cleanText },
            {
              role: 'user',
              content:
                'Write a 2-3 sentence work style summary based on everything discussed. Be specific and direct.',
            },
          ],
        });
        overallSummary =
          summaryRes.content[0].type === 'text' ? summaryRes.content[0].text : null;
      } catch {
        overallSummary = null;
      }
    }

    const insights = {
      compression_profile: signals.compression
        ? { preference: signals.compression, description: '' }
        : null,
      friction_profile: signals.friction
        ? { preference: signals.friction, description: '' }
        : null,
      execution_profile: signals.execution
        ? { preference: signals.execution, description: '' }
        : null,
      contradiction_profile: signals.contradiction
        ? { preference: signals.contradiction, description: '' }
        : null,
      overall_summary: overallSummary,
      confidence_score: confidence / 100,
      confidence_scores: {
        directness: signals.compression ? Math.min(95, Math.round(confidence * 0.9)) : Math.min(55, Math.round(confidence * 0.5)),
        execution: signals.execution ? Math.min(95, Math.round(confidence * 0.95)) : Math.min(55, Math.round(confidence * 0.5)),
        friction_tolerance: signals.friction ? Math.min(95, Math.round(confidence * 0.9)) : Math.min(55, Math.round(confidence * 0.5)),
        collaboration: Math.min(60, Math.round(confidence * 0.55)),
        contradiction_acceptance: signals.contradiction ? Math.min(95, Math.round(confidence * 0.85)) : Math.min(55, Math.round(confidence * 0.5)),
        cognitive_load: signals.compression ? Math.min(90, Math.round(confidence * 0.8)) : Math.min(50, Math.round(confidence * 0.45)),
      },
      probes_completed: signals.probesCompleted,
    };

    await upsertSession(userId, chatSessionId, status, insights);

    return NextResponse.json({
      message: cleanText,
      session_id: chatSessionId,
      confidence,
      shouldShowContinue,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Interview chat error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
