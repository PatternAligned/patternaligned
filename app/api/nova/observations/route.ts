export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export interface Observation {
  id: string;
  type: 'contradiction' | 'gap' | 'engagement' | 'validation' | 'drift';
  severity: 'info' | 'warning' | 'alert';
  title: string;
  body: string;
  why: string;
  timestamp: string;
}

const GAME_KEYS = [
  'curiosity_vector', 'problem_approach', 'pace_rhythm',
  'communication_mirror', 'risk_openness', 'energy_mood_state',
  'relationship_model_selector', 'activation_pattern_selector',
];

function daysSince(isoString: string): number {
  return Math.floor((Date.now() - new Date(isoString).getTime()) / 86400000);
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any)?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;
    const now = new Date().toISOString();

    const [eventsResult, interviewResult, feedbackResult] = await Promise.all([
      pool.query(
        `SELECT event_type, metadata, created_at FROM behavioral_events WHERE user_id = $1 ORDER BY created_at DESC`,
        [userId]
      ),
      pool.query(
        `SELECT claude_insights, confidence_score, created_at FROM interview_sessions
         WHERE user_id = $1 AND status = 'completed' ORDER BY created_at DESC LIMIT 1`,
        [userId]
      ),
      pool.query(
        `SELECT metadata, created_at FROM behavioral_events
         WHERE user_id = $1 AND event_type = 'insight_feedback' ORDER BY created_at DESC`,
        [userId]
      ),
    ]);

    let goalEvents: { goal_tag: string; created_at: string }[] = [];
    try {
      const gr = await pool.query(
        `SELECT goal_tag, created_at FROM goal_events WHERE user_id = $1 ORDER BY created_at DESC`,
        [userId]
      );
      goalEvents = gr.rows;
    } catch { /* table may not exist yet */ }

    const events = eventsResult.rows;
    const interview = interviewResult.rows[0] || null;
    const feedbackRows = feedbackResult.rows;

    // Build profile maps
    const gameCovered = new Set<string>();
    const gameProfile: Record<string, string> = {};
    let lastEventTime: string | null = null;

    events.forEach((e) => {
      if (!lastEventTime) lastEventTime = e.created_at;
      if (e.event_type === 'game_event' && e.metadata?.game) {
        gameCovered.add(e.metadata.game);
        const m = e.metadata;
        if (m.game === 'curiosity_vector' && m.topic_choice) gameProfile.topic_preference = m.topic_choice;
        if (m.game === 'problem_approach' && m.approach_style) gameProfile.problem_solving_style = m.approach_style;
        if (m.game === 'pace_rhythm' && m.pace_preference) gameProfile.pace_preference = m.pace_preference;
        if (m.game === 'communication_mirror' && m.communication_style) gameProfile.communication_style = m.communication_style;
        if (m.game === 'risk_openness' && m.risk_tolerance) gameProfile.risk_tolerance = m.risk_tolerance;
        if (m.game === 'energy_mood_state' && m.energy_pattern) gameProfile.energy_pattern = m.energy_pattern;
        if (m.game === 'relationship_model_selector' && m.selected_mode) gameProfile.relationship_model = m.selected_mode;
        if (m.game === 'activation_pattern_selector' && m.activation_pattern) gameProfile.activation_pattern = m.activation_pattern;
      }
    });

    const interviewInsights = interview?.claude_insights || null;
    const observations: Observation[] = [];
    let id = 0;
    const nextId = () => `obs_${++id}`;

    // ── CONTRADICTION RULES (interview × games) ────────────────────────────
    if (interviewInsights?.execution_profile?.preference === 'rapid' &&
        gameProfile.problem_solving_style === 'Analytical') {
      observations.push({
        id: nextId(),
        type: 'contradiction',
        severity: 'warning',
        title: 'Speed vs. analysis contradiction',
        body: 'Your interview says you execute rapidly, but your game choices show you lead with analytical data-gathering. You move fast in some contexts, carefully in others.',
        why: 'Interview probe (execution) says "rapid." The Problem Approach game measured "Analytical" as your solving style. When these diverge it usually means you switch modes based on stakes or familiarity.',
        timestamp: now,
      });
    }

    if (interviewInsights?.compression_profile?.preference === 'sparse' &&
        gameProfile.communication_style === 'Narrative') {
      observations.push({
        id: nextId(),
        type: 'contradiction',
        severity: 'info',
        title: 'Asymmetric communication style',
        body: 'You prefer receiving stripped-down information, but your default output style is narrative — giving others full context. You apply different standards to input vs. output.',
        why: 'Compression probe (interview) says "sparse" — you want brevity in what you receive. Communication Mirror game says "Narrative" — you give full context when explaining. This is a common asymmetry in strong communicators.',
        timestamp: now,
      });
    }

    if (interviewInsights?.friction_profile?.preference === 'push' &&
        gameProfile.risk_tolerance === 'Conservative') {
      observations.push({
        id: nextId(),
        type: 'contradiction',
        severity: 'info',
        title: 'Selective force application',
        body: 'You push through obstacles head-on, but avoid uncertain bets. You apply force to known problems and route around unknown ones.',
        why: 'Friction probe (interview) says "push" — you confront obstacles directly. Risk Openness game says "Conservative" — you avoid uncertain bets. Together: you\'re decisive on familiar terrain, cautious on new terrain.',
        timestamp: now,
      });
    }

    // ── GAP RULES ──────────────────────────────────────────────────────────
    const missingGames = GAME_KEYS.filter((g) => !gameCovered.has(g));
    if (missingGames.length > 0 && missingGames.length <= 4) {
      observations.push({
        id: nextId(),
        type: 'gap',
        severity: 'warning',
        title: `${missingGames.length} game assessment${missingGames.length > 1 ? 's' : ''} incomplete`,
        body: `Missing: ${missingGames.map((g) => g.replace(/_/g, ' ')).join(', ')}. Each one adds signal to your profile.`,
        why: 'Profile confidence is calculated from data coverage across 8 game dimensions + 4 interview probes. Missing games = lower confidence = less personalized Nova behavior.',
        timestamp: now,
      });
    }

    if (!interview) {
      observations.push({
        id: nextId(),
        type: 'gap',
        severity: 'alert',
        title: 'Interview not completed',
        body: 'The 4-probe behavioral interview adds the most signal of any single step. Without it, cross-source pattern detection is disabled.',
        why: 'The interview probes (compression, friction, execution, contradiction) are compared against game measurements to find cross-source synergies and contradictions. Without the interview, this entire analysis layer is offline.',
        timestamp: now,
      });
    }

    // ── ENGAGEMENT RULES ───────────────────────────────────────────────────
    if (lastEventTime) {
      const daysInactive = daysSince(lastEventTime);
      if (daysInactive >= 7) {
        observations.push({
          id: nextId(),
          type: 'engagement',
          severity: 'warning',
          title: `${daysInactive} days since last session`,
          body: 'Behavioral profiles drift without reinforcement. A short check-in or Nova chat keeps your pattern data current.',
          why: 'Engagement gaps are tracked because active use generates new data points that can shift your profile. A 7+ day gap also resets some behavioral calibration signals.',
          timestamp: now,
        });
      }
    } else {
      observations.push({
        id: nextId(),
        type: 'engagement',
        severity: 'alert',
        title: 'No activity recorded yet',
        body: 'No behavioral events found. Complete the assessment to start building your profile.',
        why: 'Every game, interview, and Nova chat generates behavioral_events that feed your profile. None exist yet.',
        timestamp: now,
      });
    }

    // Goal engagement gaps
    if (goalEvents.length > 0) {
      const goalCounts: Record<string, number> = {};
      goalEvents.forEach((g) => {
        goalCounts[g.goal_tag] = (goalCounts[g.goal_tag] || 0) + 1;
      });
      const dominantGoal = Object.entries(goalCounts).sort((a, b) => b[1] - a[1])[0];
      if (dominantGoal && dominantGoal[1] >= 3) {
        observations.push({
          id: nextId(),
          type: 'engagement',
          severity: 'info',
          title: `Heavy focus on "${dominantGoal[0].replace(/_/g, ' ')}"`,
          body: `You've addressed this goal ${dominantGoal[1]} times in Nova sessions. Strong consistent pull.`,
          why: 'Goal tags are extracted from Nova responses and logged per session. High repetition on a single goal suggests strong pull or a persistent blocker.',
          timestamp: goalEvents[0].created_at,
        });
      }
    }

    // ── VALIDATION RULES ───────────────────────────────────────────────────
    const noFeedbacks = feedbackRows.filter((f) => f.metadata?.feedback === 'no').length;
    const partialFeedbacks = feedbackRows.filter((f) => f.metadata?.feedback === 'partial').length;

    if (noFeedbacks >= 2) {
      observations.push({
        id: nextId(),
        type: 'validation',
        severity: 'alert',
        title: `${noFeedbacks} profile insights marked "not right"`,
        body: 'Multiple pattern reads aren\'t resonating. This is signal — either the data is incomplete or your profile has shifted.',
        why: 'FactsSheet validation captures whether insights feel accurate. 2+ "not right" responses trigger a recalibration recommendation.',
        timestamp: feedbackRows[0]?.created_at || now,
      });
    } else if (noFeedbacks === 1 || partialFeedbacks >= 2) {
      observations.push({
        id: nextId(),
        type: 'validation',
        severity: 'warning',
        title: 'Profile calibrating — some reads off',
        body: 'At least one insight didn\'t land. More data from games or a new interview session would sharpen the pattern.',
        why: 'Partial or inaccurate insight feedback is used to weight profile confidence down and flag which dimensions need more data.',
        timestamp: feedbackRows[0]?.created_at || now,
      });
    } else if (feedbackRows.length >= 3 && noFeedbacks === 0) {
      observations.push({
        id: nextId(),
        type: 'validation',
        severity: 'info',
        title: 'Strong profile alignment',
        body: 'All validated insights are landing accurately. Pattern reads are resonating.',
        why: 'When feedback is consistently "yes" or "partial" across multiple insights, it signals the behavioral model is well-calibrated to this user.',
        timestamp: feedbackRows[0]?.created_at || now,
      });
    }

    // Sort: alerts first, then warnings, then info; within each by recency
    const order = { alert: 0, warning: 1, info: 2 };
    observations.sort((a, b) => order[a.severity] - order[b.severity]);

    return NextResponse.json({ observations });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
