import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerSession } from "next-auth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const runtime = 'nodejs';

interface EventLogData {
  event_type: string;
  message_id?: string;
  metadata: Record<string, any>;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();

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
    const body: EventLogData = await request.json();

    if (!body.event_type || !body.metadata) {
      return NextResponse.json(
        { error: 'Missing required fields: event_type and metadata' },
        { status: 400 }
      );
    }

    if (body.event_type === 'message_sent' && !body.message_id) {
      return NextResponse.json(
        { error: 'message_id required for message_sent events' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('behavioral_events')
      .insert({
        user_id: userId,
        message_id: body.message_id || null,
        event_type: body.event_type,
        metadata: {
          ...body.metadata,
          logged_at: new Date().toISOString(),
        },
      })
      .select();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to log event', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Event logged',
        event: data?.[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}