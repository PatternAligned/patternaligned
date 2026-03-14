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

async function ensureColumns() {
  // Add analysis storage columns to existing interview_sessions table
  await pool.query(`ALTER TABLE interview_sessions ADD COLUMN IF NOT EXISTS exchanges_analysis JSONB DEFAULT '[]'`).catch(() => {});
  await pool.query(`ALTER TABLE interview_sessions ADD COLUMN IF NOT EXISTS rolling_confidence_scores JSONB`).catch(() => {});
}

function calculateRollingConfidence(exchanges: Array<{ confidenceScores?: Record<string, number> }>) {
  const dimensions = ['directness', 'execution', 'detail_orientation', 'contradiction_acceptance', 'systems_thinking'];
  const rolling: Record<string, number> = {};

  dimensions.forEach((dim) => {
    const scores = exchanges
      .map((e) => e.confidenceScores?.[dim])
      .filter((s): s is number => s !== undefined);
    rolling[dim] = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  });

  const vals = Object.values(rolling).filter((v) => v > 0);
  rolling.overall = vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;

  return rolling;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any)?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;

    const {
      interviewSessionId,
      userMessage,
      exchangeNumber,
      preliminaryBaselines,
      communicationStyle,
      previousAnswers,
    } = await request.json();

    if (!userMessage || !interviewSessionId) {
      return NextResponse.json({ error: 'userMessage and interviewSessionId required' }, { status: 400 });
    }

    // Ensure columns exist (non-blocking on failure)
    await ensureColumns();

    const analysisPrompt = `You are analyzing a behavioral assessment interview response.

USER'S STATED COMMUNICATION PREFERENCES: ${(communicationStyle || []).join(', ') || 'not specified'}
PRELIMINARY BASELINES: ${JSON.stringify(preliminaryBaselines || {})}
PREVIOUS ANSWERS IN THIS SESSION:
${(previousAnswers || []).map((a: { question: string; answer: string }) => `Q: "${a.question}" A: "${a.answer}"`).join('\n') || '(first answer)'}

CURRENT RESPONSE (exchange #${exchangeNumber || 1}):
"${userMessage}"

Analyze this response. Respond ONLY in this exact JSON format, no other text:
{
  "responseLength": <word count as integer>,
  "responseSpecificity": "<vague|moderate|detailed>",
  "responseQuality": "<poor|fair|good>",
  "confidenceScores": {
    "directness": <0-100>,
    "execution": <0-100>,
    "detail_orientation": <0-100>,
    "contradiction_acceptance": <0-100>,
    "systems_thinking": <0-100>
  },
  "contradictions": [
    { "dimension": "<name>", "stated": "<previous answer>", "current": "<current answer>", "explanation": "<what's the gap>" }
  ],
  "followUpProbe": "<one natural follow-up question if answer is vague or contradicts, otherwise empty string>",
  "analysis": {
    "wordCount": <integer>,
    "specificity": "<one sentence explanation>",
    "tone": "<one sentence explanation>",
    "signals": {
      "execution_first": <boolean>,
      "analysis_first": <boolean>,
      "detail_oriented": <boolean>,
      "action_oriented": <boolean>
    }
  }
}`;

    const claudeRes = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: 'You are a behavioral assessment expert. Respond only with valid JSON.',
      messages: [{ role: 'user', content: analysisPrompt }],
    });

    const rawText = claudeRes.content[0].type === 'text' ? claudeRes.content[0].text : '{}';

    let analysis: Record<string, any>;
    try {
      // Strip any markdown code fences if Claude wrapped it
      const cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      analysis = JSON.parse(cleaned);
    } catch {
      console.error('Failed to parse analysis JSON:', rawText);
      return NextResponse.json({ success: false, error: 'Analysis parse failed' }, { status: 200 });
    }

    // Compute rolling confidence from current analysis (will be refined after DB read)
    const rolling = calculateRollingConfidence([{ confidenceScores: analysis.confidenceScores }]);

    // Store in DB — atomic JSONB append, no read-modify-write race condition
    try {
      await pool.query(
        `UPDATE interview_sessions
         SET
           exchanges_analysis = COALESCE(exchanges_analysis, '[]'::jsonb) ||
             jsonb_build_array(
               jsonb_build_object(
                 'exchange',           $1::int,
                 'userMessage',        $2,
                 'responseLength',     $3::int,
                 'responseSpecificity',$4,
                 'responseQuality',    $5,
                 'confidenceScores',   $6::jsonb,
                 'contradictions',     $7::jsonb,
                 'followUpProbe',      $8,
                 'analysis',           $9::jsonb,
                 'createdAt',          NOW()
               )
             ),
           rolling_confidence_scores = $10::jsonb,
           updated_at = NOW()
         WHERE user_id = $11 AND session_id = $12`,
        [
          exchangeNumber || 1,
          userMessage,
          analysis.responseLength ?? 0,
          analysis.responseSpecificity ?? 'vague',
          analysis.responseQuality ?? 'fair',
          JSON.stringify(analysis.confidenceScores || {}),
          JSON.stringify(analysis.contradictions || []),
          analysis.followUpProbe || '',
          JSON.stringify(analysis.analysis || {}),
          JSON.stringify(rolling),
          userId,
          interviewSessionId,
        ]
      );
    } catch (dbErr) {
      console.error('analyze-response DB write failed (non-blocking):', dbErr instanceof Error ? dbErr.message : dbErr);
    }

    return NextResponse.json({ success: true, analysis, rollingConfidence: rolling });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('analyze-response error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
