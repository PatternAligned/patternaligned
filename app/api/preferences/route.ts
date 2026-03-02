import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const runtime = 'nodejs';

interface UserPreferences {
  theme?: 'dark' | 'light' | string;
  layout_density?: 'compact' | 'balanced' | 'spacious';
  component_order?: string[];
  color_primary?: string;
  color_secondary?: string;
  color_accent?: string;
  typography_preference?: 'sans' | 'serif';
  sidebar_collapsed?: boolean;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized: No session found' },
        { status: 401 }
      );
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 404 }
      );
    }

    const userId = userData.id;

    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch preferences', details: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        {
          preferences: {
            theme: 'dark',
            layout_density: 'balanced',
            component_order: null,
            color_primary: null,
            color_secondary: null,
            color_accent: null,
            typography_preference: 'sans',
            sidebar_collapsed: false,
          },
          message: 'Using default preferences (no custom preferences saved yet)',
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        preferences: data,
        message: 'Preferences loaded',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized: No session found' },
        { status: 401 }
      );
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 404 }
      );
    }

    const userId = userData.id;
    const updates: UserPreferences = await request.json();

    const { data: existing, error: fetchError } = await supabase
      .from('user_preferences')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Supabase fetch error:', fetchError);
      return NextResponse.json(
        { error: 'Failed to check existing preferences', details: fetchError.message },
        { status: 500 }
      );
    }

    let result;

    if (existing) {
      result = await supabase
        .from('user_preferences')
        .update(updates)
        .eq('user_id', userId)
        .select();
    } else {
      result = await supabase
        .from('user_preferences')
        .insert({
          user_id: userId,
          ...updates,
        })
        .select();
    }

    const { data, error } = result;

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to update preferences', details: error.message },
        { status: 500 }
      );
    }

    (async () => {
      try {
        await supabase
          .from('behavioral_events')
          .insert({
            user_id: userId,
            event_type: 'preferences_updated',
            metadata: {
              updated_fields: Object.keys(updates),
              values: updates,
              timestamp: new Date().toISOString(),
            },
          });
      } catch (err) {
        console.warn('Failed to log preference event:', err);
      }
    })();

    return NextResponse.json(
      {
        success: true,
        message: 'Preferences updated',
        preferences: data?.[0],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}