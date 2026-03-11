export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Anthropic from '@anthropic-ai/sdk';

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const anthropic = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });

export async function POST(req: NextRequest, { params }: { params: { projectId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !(session.user as any)?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = (session.user as any).id;

  const { message, history = [], accuracy_rating } = await req.json();
  if (!message) return NextResponse.json({ error: 'message required' }, { status: 400 });

  // Load project
  const projectResult = await pool.query(`SELECT * FROM projects WHERE id = $1 AND user_id = $2`, [params.projectId, userId]);
  if (!projectResult.rows[0]) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  const project = projectResult.rows[0];

  // Load or create memory
  let memoryResult = await pool.query(`SELECT * FROM project_memory WHERE project_id = $1 AND user_id = $2`, [params.projectId, userId]).catch(() => ({ rows: [] }));

  const systemPrompt = `You are Nova, a behavioral intelligence assistant calibrating your understanding of a specific project context.

Project: ${project.name}
${project.description ? `Description: ${project.description}` : ''}

Your goal: Understand what behavioral patterns, decision styles, and working preferences apply specifically to this project context. Ask focused clarifying questions. After 2-3 exchanges, summarize what you've learned and ask for accuracy confirmation.

Keep responses concise and targeted. Focus on:
- What decisions this project requires
- What behavioral patterns are most relevant here
- What the user needs from Nova for this project specifically

Do not re-explain the user's general profile. Focus only on project-specific calibration.`;

  const messages: Anthropic.MessageParam[] = [
    ...history.map((h: any) => ({ role: h.role as 'user' | 'assistant', content: h.content })),
    { role: 'user', content: message },
  ];

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: systemPrompt,
    messages,
  });

  const responseText = response.content[0].type === 'text' ? response.content[0].text : '';

  // Update memory snapshot
  const snapshot = {
    last_message: message,
    nova_response: responseText,
    calibrated_at: new Date().toISOString(),
    accuracy_rating: accuracy_rating || null,
    turn_count: (history.length / 2) + 1,
  };

  await pool.query(`
    INSERT INTO project_memory (project_id, user_id, memory_snapshot, calibration_history, last_calibrated)
    VALUES ($1, $2, $3, $4::jsonb, NOW())
    ON CONFLICT (project_id, user_id) DO UPDATE SET
      memory_snapshot = $3,
      calibration_history = project_memory.calibration_history || $4::jsonb,
      last_calibrated = NOW(),
      updated_at = NOW()
  `, [params.projectId, userId, JSON.stringify(snapshot), JSON.stringify([snapshot])]).catch(async () => {
    // Add unique constraint if missing
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS project_memory_project_user_idx ON project_memory(project_id, user_id)`).catch(() => {});
  });

  // Update project confidence if accuracy rating provided
  if (accuracy_rating) {
    await pool.query(`UPDATE projects SET confidence = $1, updated_at = NOW() WHERE id = $2`, [accuracy_rating, params.projectId]);
  }

  return NextResponse.json({ message: responseText, snapshot });
}
