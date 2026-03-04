export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { correlatePatterns } from '@/lib/PatternCorrelationEngine';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !(session.user as any)?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    const { rows: events } = await pool.query(
      `SELECT * FROM behavioral_events WHERE user_id = $1`,
      [userId]
    );

    const profile: Record<string, string> = {};
    events.forEach((event) => {
      if (event.event_type === 'game_event' && event.metadata) {
        const { game, ...metadata } = event.metadata;
        switch (game) {
          case 'curiosity_vector':
            if (metadata.topic_choice) profile.topic_preference = metadata.topic_choice;
            break;
          case 'problem_approach':
            if (metadata.approach_style) profile.problem_solving_style = metadata.approach_style;
            break;
          case 'pace_rhythm':
            if (metadata.pace_preference) profile.pace_preference = metadata.pace_preference;
            break;
          case 'communication_mirror':
            if (metadata.communication_style) profile.communication_style = metadata.communication_style;
            break;
          case 'risk_openness':
            if (metadata.risk_tolerance) profile.risk_tolerance = metadata.risk_tolerance;
            break;
          case 'energy_mood_state':
            if (metadata.energy_pattern) profile.energy_pattern = metadata.energy_pattern;
            break;
          case 'relationship_model_selector':
            if (metadata.selected_mode) profile.relationship_model = metadata.selected_mode;
            break;
          case 'activation_pattern_selector':
            if (metadata.activation_pattern) profile.activation_pattern = metadata.activation_pattern;
            break;
        }
      }
    });

    const correlationResult = correlatePatterns(profile);

    return NextResponse.json({ success: true, profile, correlationResult });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Correlate error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
