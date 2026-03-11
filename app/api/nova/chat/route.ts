export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { buildNovaSystemPrompt } from '@/lib/novaSystemPrompt';
import Anthropic from '@anthropic-ai/sdk';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const anthropic = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });

async function getUserContext(userId: string) {
  const [prefsResult, eventsResult, interviewResult] = await Promise.all([
    pool.query(`SELECT use_cases, goals, tones, tools FROM user_preferences WHERE user_id = $1`, [userId]),
    pool.query(`SELECT metadata FROM behavioral_events WHERE user_id = $1 AND event_type = 'game_event'`, [userId]),
    pool.query(
      `SELECT claude_insights FROM interview_sessions WHERE user_id = $1 AND status = 'completed' ORDER BY created_at DESC LIMIT 1`,
      [userId]
    ),
  ]);

  const prefs = prefsResult.rows[0] || null;

  // Build game profile
  const profile: Record<string, string> = {};
  eventsResult.rows.forEach((e) => {
    const { game, ...meta } = e.metadata || {};
    switch (game) {
      case 'curiosity_vector': if (meta.topic_choice) profile.topic_preference = meta.topic_choice; break;
      case 'problem_approach': if (meta.approach_style) profile.problem_solving_style = meta.approach_style; break;
      case 'pace_rhythm': if (meta.pace_preference) profile.pace_preference = meta.pace_preference; break;
      case 'communication_mirror': if (meta.communication_style) profile.communication_style = meta.communication_style; break;
      case 'risk_openness': if (meta.risk_tolerance) profile.risk_tolerance = meta.risk_tolerance; break;
      case 'energy_mood_state': if (meta.energy_pattern) profile.energy_pattern = meta.energy_pattern; break;
      case 'relationship_model_selector': if (meta.selected_mode) profile.relationship_model = meta.selected_mode; break;
      case 'activation_pattern_selector': if (meta.activation_pattern) profile.activation_pattern = meta.activation_pattern; break;
    }
  });

  // Merge interview probes
  const insights = interviewResult.rows[0]?.claude_insights;
  if (insights) {
    if (insights.compression_profile?.preference) profile.compression = insights.compression_profile.preference;
    if (insights.friction_profile?.preference) profile.friction = insights.friction_profile.preference;
    if (insights.execution_profile?.preference) profile.execution = insights.execution_profile.preference;
    if (insights.contradiction_profile?.preference) profile.contradiction = insights.contradiction_profile.preference;
  }

  return { prefs, profile };
}

function extractGoalTags(text: string): string[] {
  const tags: string[] = [];
  const regex = /\[GOAL:([^\]]+)\]/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    tags.push(match[1].trim());
  }
  return tags;
}

function stripGoalTags(text: string): string {
  return text.replace(/\[GOAL:[^\]]+\]\n?/g, '').trim();
}

async function logGoals(userId: string, goalTags: string[], sessionId: string) {
  if (!goalTags.length) return;
  await Promise.all(
    goalTags.map((tag) =>
      pool.query(
        `INSERT INTO goal_events (user_id, goal_tag, session_id, created_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT DO NOTHING`,
        [userId, tag, sessionId]
      ).catch(() => {
        // Create table if missing
        return pool.query(`
          CREATE TABLE IF NOT EXISTS goal_events (
            id SERIAL PRIMARY KEY,
            user_id TEXT NOT NULL,
            goal_tag TEXT NOT NULL,
            session_id TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
          )
        `).then(() =>
          pool.query(
            `INSERT INTO goal_events (user_id, goal_tag, session_id, created_at) VALUES ($1, $2, $3, NOW())`,
            [userId, tag, sessionId]
          )
        );
      })
    )
  );
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

    const { prefs, profile } = await getUserContext(userId);
    const systemPrompt = buildNovaSystemPrompt(prefs, profile);

    const messages: Anthropic.MessageParam[] = [
      ...history.map((h: { role: string; content: string }) => ({
        role: h.role as 'user' | 'assistant',
        content: h.content,
      })),
      { role: 'user', content: message },
    ];

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: systemPrompt,
      messages,
    });

    const rawText = response.content[0].type === 'text' ? response.content[0].text : '';
    const goalTags = extractGoalTags(rawText);
    const cleanText = stripGoalTags(rawText);

    const chatSessionId = session_id || `nova-${userId}-${Date.now()}`;
    if (goalTags.length) {
      await logGoals(userId, goalTags, chatSessionId);
    }

    return NextResponse.json({
      message: cleanText,
      goal_tags: goalTags,
      session_id: chatSessionId,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Nova chat error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
