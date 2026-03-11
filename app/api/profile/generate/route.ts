export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { buildNarrative, ProfileNarrative } from '@/lib/profile/NarrativeBuilder';
import type { InterviewData, GameData, VibeData } from '@/lib/profile/BehavioralMeasurements';

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const COGNITIVE_PROFILES_DDL = `
CREATE TABLE IF NOT EXISTS cognitive_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  interview_session_id UUID,
  who_you_are TEXT,
  how_you_decide TEXT,
  what_you_need TEXT,
  measurements JSONB DEFAULT '{}',
  confidence_score INTEGER DEFAULT 0,
  confidence_explanation TEXT,
  is_validated BOOLEAN DEFAULT false,
  calibration_notes JSONB DEFAULT '[]',
  user_self_rating INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS cognitive_profiles_user_idx ON cognitive_profiles(user_id);
`;

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !(session.user as any)?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = (session.user as any).id;

  // Ensure table exists
  try {
    await pool.query(COGNITIVE_PROFILES_DDL);
  } catch {
    // ignore DDL errors on subsequent runs
  }

  // Fetch all data in parallel
  const [interviewResult, eventsResult, prefsResult] = await Promise.all([
    pool
      .query(
        `SELECT claude_insights, id FROM interview_sessions WHERE user_id=$1 AND status='completed' ORDER BY created_at DESC LIMIT 1`,
        [userId]
      )
      .catch(() => ({ rows: [] as any[] })),
    pool
      .query(
        `SELECT * FROM behavioral_events WHERE user_id=$1 ORDER BY created_at ASC`,
        [userId]
      )
      .catch(() => ({ rows: [] as any[] })),
    pool
      .query(`SELECT tones FROM user_preferences WHERE user_id=$1 LIMIT 1`, [userId])
      .catch(() => ({ rows: [] as any[] })),
  ]);

  // Attempt fallback for tones from users table if not in user_preferences
  let tonePrefs: string[] | undefined;
  if (prefsResult.rows.length > 0 && prefsResult.rows[0].tones) {
    tonePrefs = prefsResult.rows[0].tones;
  } else {
    try {
      const usersPrefs = await pool.query(
        `SELECT tones FROM users WHERE id=$1 LIMIT 1`,
        [userId]
      );
      if (usersPrefs.rows.length > 0 && usersPrefs.rows[0].tones) {
        tonePrefs = usersPrefs.rows[0].tones;
      }
    } catch {
      // neither table has tones — fine
    }
  }

  // Build InterviewData
  const claudeInsights = interviewResult.rows[0]?.claude_insights || null;
  const interviewSessionId = interviewResult.rows[0]?.id || null;

  const interview: InterviewData = {
    compression: claudeInsights?.compression_profile?.description || claudeInsights?.compression_profile,
    friction: claudeInsights?.friction_profile?.description || claudeInsights?.friction_profile,
    execution: claudeInsights?.execution_profile?.description || claudeInsights?.execution_profile,
    contradiction: claudeInsights?.contradiction_profile?.description || claudeInsights?.contradiction_profile,
    overall_summary: claudeInsights?.overall_summary,
  };

  // Build GameData and counts from behavioral_events
  const gameEvents: Record<string, any> = {};
  const vibeSignals: any[] = [];
  let interviewCompleteCount = 0;

  for (const row of eventsResult.rows) {
    if (row.event_type === 'game_event' && row.metadata?.game) {
      gameEvents[row.metadata.game] = row.metadata;
    }
    if (row.event_type === 'vibe_signal') {
      vibeSignals.push(row.metadata);
    }
    if (row.event_type === 'interview_complete') {
      interviewCompleteCount++;
    }
  }

  // If interview_sessions has a completed row, count that too
  const interviewCount = interviewResult.rows.length > 0
    ? Math.max(interviewResult.rows.length, interviewCompleteCount)
    : interviewCompleteCount;

  const games: GameData = {
    pace: gameEvents['pace_rhythm']?.pace_preference,
    curiosity: gameEvents['curiosity_vector']?.topic_choice,
    communication: gameEvents['communication_mirror']?.communication_style,
    risk: gameEvents['risk_openness']?.risk_tolerance,
    energy: gameEvents['energy_mood_state']?.energy_pattern,
    problemApproach: gameEvents['problem_approach']?.approach_style,
  };

  // Build VibeData from last 3 vibe_signal events (averaged)
  const recentVibes = vibeSignals.slice(-3);
  const vibe: VibeData = {};
  if (recentVibes.length > 0) {
    const avg = (key: string) => {
      const vals = recentVibes.map((v) => v[key]).filter((v) => typeof v === 'number');
      return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : undefined;
    };
    vibe.directness = avg('directness');
    vibe.formality = avg('formality');
    vibe.teamDynamic = avg('teamDynamic');
    vibe.conflictStyle = avg('conflictStyle');
    vibe.energyLevel = avg('energyLevel');
    vibe.messageLength = recentVibes[recentVibes.length - 1]?.messageLength;
  }

  const gameCount = Object.keys(gameEvents).length;
  const chatCount = vibeSignals.length;

  const counts = { interviews: interviewCount, games: gameCount, chats: chatCount };

  // Generate narrative via Claude
  let narrative: ProfileNarrative;
  try {
    narrative = await buildNarrative(interview, games, vibe, counts, tonePrefs);
  } catch (err) {
    console.error('buildNarrative failed:', err);
    return NextResponse.json({ error: 'Failed to generate profile narrative' }, { status: 500 });
  }

  // Upsert into cognitive_profiles
  try {
    await pool.query(
      `INSERT INTO cognitive_profiles
        (user_id, interview_session_id, who_you_are, how_you_decide, what_you_need, measurements, confidence_score, confidence_explanation, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         interview_session_id = EXCLUDED.interview_session_id,
         who_you_are = EXCLUDED.who_you_are,
         how_you_decide = EXCLUDED.how_you_decide,
         what_you_need = EXCLUDED.what_you_need,
         measurements = EXCLUDED.measurements,
         confidence_score = EXCLUDED.confidence_score,
         confidence_explanation = EXCLUDED.confidence_explanation,
         updated_at = NOW()`,
      [
        userId,
        interviewSessionId,
        narrative.whoYouAre,
        narrative.howYouDecide,
        narrative.whatYouNeed,
        JSON.stringify(narrative.measurements),
        narrative.confidence.score,
        narrative.confidence.explanation,
      ]
    );
  } catch (err) {
    console.error('cognitive_profiles upsert failed:', err);
    // Don't block the response — return the narrative anyway
  }

  return NextResponse.json({
    profile: {
      whoYouAre: narrative.whoYouAre,
      howYouDecide: narrative.howYouDecide,
      whatYouNeed: narrative.whatYouNeed,
      measurements: narrative.measurements,
      confidence: narrative.confidence,
      isValidated: false,
      userSelfRating: null,
    },
    behavioralData: {
      interview,
      games,
      vibe,
      counts,
    },
  });
}
