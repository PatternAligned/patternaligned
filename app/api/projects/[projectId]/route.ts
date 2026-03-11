export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

export async function GET(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !(session.user as any)?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = (session.user as any).id;
  const { projectId } = await params;
  const [project, memory] = await Promise.all([
    pool.query(`SELECT * FROM projects WHERE id = $1 AND user_id = $2`, [projectId, userId]),
    pool.query(`SELECT * FROM project_memory WHERE project_id = $1 AND user_id = $2`, [projectId, userId]).catch(() => ({ rows: [] })),
  ]);
  if (!project.rows[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ project: project.rows[0], memory: memory.rows[0] || null });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !(session.user as any)?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = (session.user as any).id;
  const { projectId } = await params;
  const body = await req.json();
  const fields: string[] = [];
  const vals: any[] = [];
  let i = 1;
  if (body.name !== undefined) { fields.push(`name = $${i++}`); vals.push(body.name); }
  if (body.description !== undefined) { fields.push(`description = $${i++}`); vals.push(body.description); }
  if (body.confidence !== undefined) { fields.push(`confidence = $${i++}`); vals.push(body.confidence); }
  if (body.metadata !== undefined) { fields.push(`metadata = $${i++}`); vals.push(JSON.stringify(body.metadata)); }
  if (!fields.length) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  fields.push(`updated_at = NOW()`);
  vals.push(projectId, userId);
  const result = await pool.query(
    `UPDATE projects SET ${fields.join(', ')} WHERE id = $${i++} AND user_id = $${i} RETURNING *`,
    vals
  );
  return NextResponse.json({ project: result.rows[0] });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !(session.user as any)?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = (session.user as any).id;
  const { projectId } = await params;
  await pool.query(`DELETE FROM projects WHERE id = $1 AND user_id = $2`, [projectId, userId]);
  return NextResponse.json({ success: true });
}
