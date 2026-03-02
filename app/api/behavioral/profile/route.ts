import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user ID
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get all behavioral events for this user
    const { data: events, error: eventsError } = await supabase
      .from('behavioral_events')
      .select('*')
      .eq('user_id', userData.id)
      .order('created_at', { ascending: false });

    if (eventsError) {
      return NextResponse.json(
        { error: 'Failed to fetch behavioral data' },
        { status: 500 }
      );
    }

    // Aggregate the data
    const profile = aggregateBehavioralData(events || []);

    return NextResponse.json(
      {
        success: true,
        profile,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching behavioral profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

interface BehavioralEvent {
  metadata: Record<string, any>;
}

interface AggregatedProfile {
  relationship_model: string | null;
  communication_style: string | null;
  pace_preference: string | null;
  risk_tolerance: string | null;
  energy_pattern: string | null;
  topic_preference: string | null;
  problem_solving_style: string | null;
}

function aggregateBehavioralData(events: BehavioralEvent[]): AggregatedProfile {
  const profile: AggregatedProfile = {
    relationship_model: null,
    communication_style: null,
    pace_preference: null,
    risk_tolerance: null,
    energy_pattern: null,
    topic_preference: null,
    problem_solving_style: null,
  };

  for (const event of events) {
    const metadata = event.metadata || {};

    if (metadata.game === 'relationship_model_selector') {
      profile.relationship_model = metadata.selected_mode;
    }
    if (metadata.game === 'communication_mirror') {
      profile.communication_style = metadata.communication_style;
    }
    if (metadata.game === 'pace_rhythm') {
      profile.pace_preference = metadata.pace_preference;
    }
    if (metadata.game === 'risk_openness') {
      profile.risk_tolerance = metadata.risk_tolerance;
    }
    if (metadata.game === 'energy_mood_state') {
      profile.energy_pattern = metadata.energy_pattern;
    }
    if (metadata.game === 'curiosity_vector') {
      profile.topic_preference = metadata.topic_choice;
    }
    if (metadata.game === 'problem_approach') {
      profile.problem_solving_style = metadata.approach_style;
    }
  }

  return profile;
}