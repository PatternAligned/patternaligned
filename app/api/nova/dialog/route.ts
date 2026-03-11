export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Maps profile gaps to targeted follow-up questions
const GAP_QUESTIONS: Record<string, { question: string; probe: string; placeholder: string }> = {
  topic_preference: {
    probe: 'curiosity_vector',
    question: 'What topics genuinely obsess you — abstract systems, practical problems, historical patterns, or something else?',
    placeholder: 'e.g. I get pulled into systems thinking and how things interconnect...',
  },
  problem_solving_style: {
    probe: 'problem_approach',
    question: 'When you hit a real problem, what\'s your instinct — dig into data, trust your gut, pull others in, or delegate to the right person?',
    placeholder: 'e.g. I usually want to map the whole problem before I act...',
  },
  pace_preference: {
    probe: 'pace_rhythm',
    question: 'How do you actually work — sprint in intense bursts, cruise at a steady pace, find your own flow, or adapt to whatever\'s in front of you?',
    placeholder: 'e.g. I do my best work in 2-3 hour uninterrupted blocks...',
  },
  communication_style: {
    probe: 'communication_mirror',
    question: 'When explaining something important, do you tend to be concise, follow a clear structure, tell it as a story, or reach for visuals?',
    placeholder: 'e.g. I usually lead with the punchline and add context only if asked...',
  },
  risk_tolerance: {
    probe: 'risk_openness',
    question: 'How do you approach risk — carefully with evidence first, calculated after weighing options, aggressively and adjust from results, or contextually?',
    placeholder: 'e.g. Depends on stakes — low stakes I move fast, high stakes I want data...',
  },
  energy_pattern: {
    probe: 'energy_mood_state',
    question: 'When does your best thinking happen — morning, afternoon, when you\'re in flow, or does it stay consistent throughout the day?',
    placeholder: 'e.g. Mornings are gold for me. By 3pm I\'m in execution mode only...',
  },
  relationship_model: {
    probe: 'relationship_model_selector',
    question: 'What\'s your ideal working relationship with an AI — just get me output with minimal back-and-forth, collaborate with me, give me a framework to follow, or ask me questions?',
    placeholder: 'e.g. I want it to challenge me and push back, not just agree...',
  },
  activation_pattern: {
    probe: 'activation_pattern_selector',
    question: 'What state do you do your best work in — deep uninterrupted focus, rapid-fire back-and-forth, clear structure and direction, quiet independence, or reflective processing?',
    placeholder: 'e.g. I need at least 90 minutes of silence before I\'m really in it...',
  },
};

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any)?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;

    // Get existing game measurements
    const { rows: events } = await pool.query(
      `SELECT metadata FROM behavioral_events WHERE user_id = $1 AND event_type = 'game_event'`,
      [userId]
    );

    const covered = new Set<string>();
    events.forEach((e) => {
      if (e.metadata?.game) covered.add(e.metadata.game);
    });

    // Also check if interview is done
    const { rows: sessions } = await pool.query(
      `SELECT id FROM interview_sessions WHERE user_id = $1 AND status = 'completed' LIMIT 1`,
      [userId]
    );
    const hasInterview = sessions.length > 0;

    // Find gaps (missing game measurements)
    const gaps = Object.entries(GAP_QUESTIONS)
      .filter(([, v]) => !covered.has(v.probe))
      .slice(0, 3); // Max 3 follow-up questions

    const questions = gaps.map(([key, q]) => ({ key, ...q }));
    const confidenceBase = Math.round(
      ((covered.size / 8) * 60 + (hasInterview ? 40 : 0))
    );

    return NextResponse.json({ questions, confidence: confidenceBase, has_interview: hasInterview });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any)?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;
    const { answers } = await request.json();
    // answers: Array<{ probe: string; question: string; answer: string }>

    if (!Array.isArray(answers) || answers.length === 0) {
      return NextResponse.json({ error: 'answers array required' }, { status: 400 });
    }

    await Promise.all(
      answers.map((a) =>
        pool.query(
          `INSERT INTO behavioral_events (user_id, event_type, metadata, created_at)
           VALUES ($1, 'nova_dialog', $2, NOW())`,
          [userId, JSON.stringify({ probe: a.probe, question: a.question, answer: a.answer })]
        )
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
