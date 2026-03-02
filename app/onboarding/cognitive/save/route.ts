import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const runtime = 'nodejs';

interface OnboardingData {
  communication_preference: 'banter_direct' | 'structured' | 'mixed' | 'formal';
  work_domain: string;
  email_style_preference: 'sarcastic' | 'formal' | 'casual' | 'technical';
  work_velocity_preference: 'fast_iterate' | 'deep_focus' | 'balanced';
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
    const body: OnboardingData = await request.json();

    if (
      !body.communication_preference ||
      !body.work_domain ||
      !body.email_style_preference ||
      !body.work_velocity_preference
    ) {
      return NextResponse.json(
        { error: 'Missing required onboarding fields' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('users')
      .update({
        communication_preference: body.communication_preference,
        work_domain: body.work_domain,
        email_style_preference: body.email_style_preference,
        work_velocity_preference: body.work_velocity_preference,
      })
      .eq('id', userId)
      .select();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to save onboarding data', details: error.message },
        { status: 500 }
      );
    }

    const { error: eventError } = await supabase
      .from('behavioral_events')
      .insert({
        user_id: userId,
        event_type: 'onboarding_completed',
        metadata: {
          communication_preference: body.communication_preference,
          work_domain: body.work_domain,
          email_style_preference: body.email_style_preference,
          work_velocity_preference: body.work_velocity_preference,
          timestamp: new Date().toISOString(),
        },
      });

    if (eventError) {
      console.warn('Failed to log onboarding event:', eventError);
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Onboarding data saved',
        user: data[0],
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