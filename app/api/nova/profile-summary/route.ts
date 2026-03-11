export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Anthropic from '@anthropic-ai/sdk';

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const anthropic = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !(session.user as any)?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = (session.user as any).id;

  const [eventsResult, interviewResult, chatCountResult] = await Promise.all([
    pool.query(`SELECT * FROM behavioral_events WHERE user_id = $1 ORDER BY created_at ASC`, [userId]),
    pool.query(`SELECT claude_insights FROM interview_sessions WHERE user_id = $1 AND status = 'completed' ORDER BY created_at DESC LIMIT 1`, [userId]),
    pool.query(`SELECT COUNT(*) FROM behavioral_events WHERE user_id = $1 AND event_type = 'vibe_signal'`, [userId]).catch(() => ({ rows: [{ count: '0' }] })),
  ]);

  const gameEvents: Record<string, any> = {};
  const vibeSignals: any[] = [];
  let interviewCount = 0;

  eventsResult.rows.forEach((e) => {
    if (e.event_type === 'game_event' && e.metadata?.game) {
      gameEvents[e.metadata.game] = e.metadata;
    }
    if (e.event_type === 'vibe_signal') vibeSignals.push(e.metadata);
    if (e.event_type === 'interview_complete') interviewCount++;
  });

  const interview = interviewResult.rows[0]?.claude_insights || null;
  const chatCount = parseInt(chatCountResult.rows[0]?.count || '0');
  const gameCount = Object.keys(gameEvents).length;

  // Build confidence
  const baseConfidence = Math.min(
    (interview ? 25 : 0) +
    (gameCount * 5) +
    (chatCount * 2) +
    (interviewCount * 10),
    100
  );

  // Latest vibe
  const latestVibe = vibeSignals.length > 0 ? vibeSignals[vibeSignals.length - 1] : null;

  // Build behavioral data object for Claude to narrativize
  const behavioralData = {
    interview: interview ? {
      compression: interview.compression_profile,
      friction: interview.friction_profile,
      execution: interview.execution_profile,
      contradiction: interview.contradiction_profile,
      overall_summary: interview.overall_summary,
    } : null,
    games: {
      pace: gameEvents['pace_rhythm']?.pace_preference || null,
      curiosity: gameEvents['curiosity_vector']?.topic_choice || null,
      problemApproach: gameEvents['problem_approach']?.approach_style || null,
      communication: gameEvents['communication_mirror']?.communication_style || null,
      risk: gameEvents['risk_openness']?.risk_tolerance || null,
      energy: gameEvents['energy_mood_state']?.energy_pattern || null,
      paceDecisionTime: gameEvents['pace_rhythm']?.response_time_ms || null,
    },
    vibe: latestVibe ? {
      directness: latestVibe.directness,
      formality: latestVibe.formality,
      problemApproach: latestVibe.problemApproach,
      teamDynamic: latestVibe.teamDynamic,
      conflictStyle: latestVibe.conflictStyle,
      energyLevel: latestVibe.energyLevel,
    } : null,
    counts: { interviews: interviewCount, games: gameCount, chats: chatCount },
    confidence: baseConfidence,
  };

  if (!behavioralData.interview && gameCount === 0) {
    return NextResponse.json({
      sections: null,
      confidence: 0,
      message: 'No behavioral data yet. Complete the interview and cognitive games first.',
    });
  }

  const prompt = `You are generating a behavioral intelligence summary for a user based on their assessment data. Write in second person ("you"). Be specific and use measurements where possible. Never write "this person".

BEHAVIORAL DATA:
${JSON.stringify(behavioralData, null, 2)}

Generate a structured JSON response with exactly these sections:

{
  "who_you_are": "2-3 sentences. Specific behavioral traits with evidence. Example: 'You're a calculated risk-taker with high execution velocity. You move decisively when stakes are clear, but invest heavily in due diligence when hiring or strategy is involved.'",

  "how_you_decide": [
    {
      "label": "Decision Velocity",
      "measurement": "Specific measurement with context. Example: 'Fast from problem→action when execution stakes are clear. Slower when hiring or strategy is involved.'",
      "source": "friction_probe or pace_game"
    },
    {
      "label": "Risk Threshold",
      "measurement": "Specific risk tolerance with context. Example: 'Takes execution risks freely. More cautious on hiring/partnership decisions.'",
      "source": "risk_game or execution_probe"
    },
    {
      "label": "Information Structure",
      "measurement": "What they need before deciding. Example: 'Needs cost/timeline/risk framework before depth. Rejects explanations missing tradeoff structure.'",
      "source": "compression_probe"
    },
    {
      "label": "Communication Style",
      "measurement": "How they communicate and validate. Example: 'Prefers direct, async feedback. Validates with small trusted group rather than consensus-building.'",
      "source": "vibe_detection or communication_game"
    }
  ],

  "what_you_need": "2-3 sentences on how Nova should adapt. Example: 'Nova should match your sprint-mode intensity. Lead with conclusions, offer options, skip the preamble. You need cost/risk tradeoffs before detail.'",

  "confidence_explanation": "1-2 sentences explaining the confidence score and what data it's based on. Example: 'Based on ${behavioralData.counts.interviews} interview${behavioralData.counts.interviews !== 1 ? 's' : ''}, ${behavioralData.counts.games} cognitive game${behavioralData.counts.games !== 1 ? 's' : ''}, and ${behavioralData.counts.chats} Nova interaction${behavioralData.counts.chats !== 1 ? 's' : ''}. Gaps: ${behavioralData.games.curiosity === null ? 'curiosity vector not measured.' : ''}'",

  "next_step": "Does this feel accurate? If not, use the refine button to tell Nova what's missing. If yes, head to your workspace — Nova will sharpen its understanding through your work."
}

Return ONLY valid JSON. No markdown. No explanation.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = response.content[0].type === 'text' ? response.content[0].text : '{}';
  const sections = JSON.parse(raw.replace(/^```(?:json)?\n?|\n?```\s*$/g, '').trim());

  return NextResponse.json({ sections, confidence: baseConfidence, behavioral_data: behavioralData });
}
