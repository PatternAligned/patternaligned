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

export interface Alert {
  id: string;
  type: 'confidence' | 'inactivity' | 'correction' | 'gap' | 'validation';
  severity: 'warning' | 'critical';
  title: string;
  detail: string;
  triggered_at: string;
  suggestion: string;
}

const GAME_KEYS = [
  'curiosity_vector', 'problem_approach', 'pace_rhythm',
  'communication_mirror', 'risk_openness', 'energy_mood_state',
  'relationship_model_selector', 'activation_pattern_selector',
];

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any)?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;

    const [eventsResult, interviewResult, feedbackResult] = await Promise.all([
      pool.query(
        `SELECT event_type, metadata, created_at FROM behavioral_events
         WHERE user_id = $1 ORDER BY created_at DESC`,
        [userId]
      ),
      pool.query(
        `SELECT confidence_score, created_at FROM interview_sessions
         WHERE user_id = $1 AND status = 'completed' ORDER BY created_at DESC LIMIT 1`,
        [userId]
      ),
      pool.query(
        `SELECT metadata, created_at FROM behavioral_events
         WHERE user_id = $1 AND event_type = 'insight_feedback' ORDER BY created_at DESC`,
        [userId]
      ),
    ]);

    const alerts: Alert[] = [];
    const now = new Date().toISOString();
    const events = eventsResult.rows;
    const interview = interviewResult.rows[0] || null;
    const feedbackRows = feedbackResult.rows;

    // ── CONFIDENCE THRESHOLD ───────────────────────────────────────────────
    const rawConfidence = interview?.confidence_score ? parseFloat(interview.confidence_score) : null;
    const confidencePct = rawConfidence !== null ? Math.round(rawConfidence * 100) : null;

    if (confidencePct !== null && confidencePct < 80) {
      alerts.push({
        id: 'alert_confidence',
        type: 'confidence',
        severity: confidencePct < 60 ? 'critical' : 'warning',
        title: 'Profile confidence below 80%',
        detail: `Current confidence: ${confidencePct}%. Target: 80%+.`,
        triggered_at: interview.created_at,
        suggestion: `Complete ${Math.ceil((80 - confidencePct) / 10)} more assessment steps to reach target confidence. Focus on any incomplete game assessments first.`,
      });
    }

    // ── INACTIVITY THRESHOLD ───────────────────────────────────────────────
    const lastEvent = events[0];
    if (lastEvent) {
      const daysSinceLast = Math.floor(
        (Date.now() - new Date(lastEvent.created_at).getTime()) / 86400000
      );
      if (daysSinceLast >= 7) {
        alerts.push({
          id: 'alert_inactivity',
          type: 'inactivity',
          severity: daysSinceLast >= 14 ? 'critical' : 'warning',
          title: `${daysSinceLast} days without a session`,
          detail: `Last activity: ${new Date(lastEvent.created_at).toLocaleDateString()}.`,
          triggered_at: now,
          suggestion: 'A short Nova chat or one game assessment reactivates your profile signal. Even 5 minutes helps.',
        });
      }
    } else {
      alerts.push({
        id: 'alert_no_activity',
        type: 'inactivity',
        severity: 'critical',
        title: 'No sessions recorded',
        detail: 'No behavioral events found for this account.',
        triggered_at: now,
        suggestion: 'Start with the behavioral interview at /onboarding/interview to build your first profile.',
      });
    }

    // ── REPEATED CORRECTION (same insight rejected 3x) ────────────────────
    const noFeedbacks = feedbackRows.filter((f) => f.metadata?.feedback === 'no');
    if (noFeedbacks.length >= 2) {
      alerts.push({
        id: 'alert_correction',
        type: 'correction',
        severity: noFeedbacks.length >= 3 ? 'critical' : 'warning',
        title: `${noFeedbacks.length} profile insights marked inaccurate`,
        detail: `You flagged ${noFeedbacks.length} insights as "not right" in FactsSheet validation.`,
        triggered_at: noFeedbacks[0]?.created_at || now,
        suggestion: 'These mismatches usually mean the profile needs more data or a context shift. Try re-running the interview or completing remaining games.',
      });
    }

    // ── GAME COVERAGE GAP ─────────────────────────────────────────────────
    const gameCovered = new Set<string>();
    events.forEach((e) => {
      if (e.event_type === 'game_event' && e.metadata?.game) gameCovered.add(e.metadata.game);
    });
    const missingCount = GAME_KEYS.filter((g) => !gameCovered.has(g)).length;
    if (missingCount > 4) {
      alerts.push({
        id: 'alert_gap',
        type: 'gap',
        severity: 'critical',
        title: `${missingCount} of 8 game assessments missing`,
        detail: 'More than half the behavioral signal is absent.',
        triggered_at: now,
        suggestion: 'Go to /onboarding/cognitive to complete the game sequence. Each game takes under 2 minutes.',
      });
    }

    // ── USER-FLAGGED ISSUES ───────────────────────────────────────────────
    const flaggedInsights = feedbackRows
      .filter((f) => f.metadata?.feedback === 'no')
      .map((f) => `Insight #${f.metadata?.insight_index ?? '?'}`);
    if (flaggedInsights.length > 0 && !alerts.find((a) => a.id === 'alert_correction')) {
      alerts.push({
        id: 'alert_validation',
        type: 'validation',
        severity: 'warning',
        title: 'User-flagged profile issues',
        detail: `Flagged: ${flaggedInsights.join(', ')}.`,
        triggered_at: feedbackRows[0]?.created_at || now,
        suggestion: 'Ask Nova to re-interpret these patterns. Your additional context often resolves the mismatch.',
      });
    }

    // Sort critical first
    alerts.sort((a, b) => (a.severity === 'critical' ? -1 : 1) - (b.severity === 'critical' ? -1 : 1));

    return NextResponse.json({ alerts });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
