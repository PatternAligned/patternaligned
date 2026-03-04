export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS waitlist (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    }

    const normalized = email.toLowerCase().trim();

    // Always persist to DB
    await ensureTable();
    await pool.query(
      `INSERT INTO waitlist (email) VALUES ($1) ON CONFLICT (email) DO NOTHING`,
      [normalized]
    );

    if (!process.env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY not set — email saved to DB only');
      return NextResponse.json({ success: true });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    // Notify hello@patternaligned.com
    await resend.emails.send({
      from: 'PatternAligned <noreply@patternaligned.com>',
      to: 'hello@patternaligned.com',
      subject: `New waitlist signup: ${normalized}`,
      html: `
        <div style="font-family:monospace;background:#000;color:#fff;padding:40px;max-width:500px">
          <p style="color:#71717a;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;margin-bottom:24px">PatternAligned / Waitlist</p>
          <p style="font-size:20px;font-weight:300;margin-bottom:8px">${normalized}</p>
          <p style="color:#52525b;font-size:12px;">joined the waitlist.</p>
        </div>
      `,
    });

    // Confirmation to the user
    await resend.emails.send({
      from: 'PatternAligned <hello@patternaligned.com>',
      to: normalized,
      subject: "You're on the list.",
      html: `
        <div style="font-family:monospace;background:#000;color:#fff;padding:40px;max-width:500px">
          <p style="color:#71717a;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;margin-bottom:32px">PatternAligned</p>
          <p style="font-size:24px;font-weight:300;margin-bottom:16px;letter-spacing:-0.02em">You're on the list.</p>
          <p style="color:#a1a1aa;font-size:14px;line-height:1.8;margin-bottom:32px">
            When PatternAligned opens early access, you'll be the first to know.<br>
            We're building something that actually holds your cognitive fingerprint — not a generic assistant pretending to.
          </p>
          <div style="border-top:1px solid #27272a;padding-top:24px;margin-top:24px">
            <p style="color:#52525b;font-size:11px;letter-spacing:0.15em;text-transform:uppercase">patternaligned.com</p>
          </div>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Email capture error:', msg);
    return NextResponse.json({ error: 'Failed to process signup' }, { status: 500 });
  }
}
