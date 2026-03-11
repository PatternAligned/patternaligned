export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Anthropic from '@anthropic-ai/sdk';

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !(session.user as any)?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = (session.user as any).id;

  let body: { message: string; history: Array<{ role: string; content: string }>; selfRating?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { message, history, selfRating } = body;

  // Load current profile context
  let profileContext = '';
  try {
    const profileResult = await pool.query(
      `SELECT who_you_are, how_you_decide, what_you_need, measurements FROM cognitive_profiles WHERE user_id=$1 LIMIT 1`,
      [userId]
    );
    if (profileResult.rows.length > 0) {
      const row = profileResult.rows[0];
      profileContext = `
Current profile for this user:
- Who they are: ${row.who_you_are || 'not set'}
- How they decide: ${row.how_you_decide || 'not set'}
- What they need: ${row.what_you_need || 'not set'}
- Measurements: ${JSON.stringify(row.measurements || {})}
      `.trim();
    }
  } catch {
    // proceed without profile context
  }

  const systemPrompt = `You are Nova, calibrating your understanding of this user's behavioral profile. The user is reviewing their generated profile and telling you what's inaccurate or missing. Ask focused clarifying questions — one at a time. After 2-3 exchanges, say 'Does this feel more accurate now?' and wait for confirmation. Be specific and direct. No corporate speak.

${profileContext}`;

  // Build messages array for Claude
  const claudeMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  for (const h of history) {
    if (h.role === 'user' || h.role === 'assistant') {
      claudeMessages.push({ role: h.role as 'user' | 'assistant', content: h.content });
    }
  }
  claudeMessages.push({ role: 'user', content: message });

  let responseText = '';
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      system: systemPrompt,
      messages: claudeMessages,
    });
    responseText = response.content[0].type === 'text' ? response.content[0].text : '';
  } catch (err) {
    console.error('calibrate anthropic call failed:', err);
    return NextResponse.json({ error: 'Failed to get Nova response' }, { status: 500 });
  }

  // If selfRating provided, append calibration note
  if (typeof selfRating === 'number') {
    try {
      await pool.query(
        `UPDATE cognitive_profiles
         SET user_self_rating=$1,
             calibration_notes=calibration_notes || $2::jsonb,
             updated_at=NOW()
         WHERE user_id=$3`,
        [
          selfRating,
          JSON.stringify({ note: message, rating: selfRating, timestamp: new Date().toISOString() }),
          userId,
        ]
      );
    } catch (err) {
      console.error('calibrate notes update failed:', err);
      // non-fatal — still return Nova's response
    }
  }

  const turnCount = Math.floor(history.length / 2) + 1;

  return NextResponse.json({ response: responseText, turnCount });
}
