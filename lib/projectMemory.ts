import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

export interface ProjectMemorySnapshot {
  project_id: string;
  user_id: string;
  memory_snapshot: Record<string, any>;
  calibration_history: any[];
  last_calibrated: string | null;
}

export async function getProjectMemory(projectId: string, userId: string): Promise<ProjectMemorySnapshot | null> {
  try {
    const result = await pool.query(
      `SELECT * FROM project_memory WHERE project_id = $1 AND user_id = $2`,
      [projectId, userId]
    );
    return result.rows[0] || null;
  } catch {
    return null;
  }
}

export async function buildProjectSystemPromptAddition(projectId: string, userId: string): Promise<string> {
  const memory = await getProjectMemory(projectId, userId);
  if (!memory?.memory_snapshot || Object.keys(memory.memory_snapshot).length === 0) return '';

  const snap = memory.memory_snapshot;
  const parts: string[] = [`PROJECT CONTEXT: ${snap.project_name || 'Active project'}`];

  if (snap.last_message) parts.push(`Last calibration topic: ${snap.last_message}`);
  if (snap.accuracy_rating) parts.push(`User-rated accuracy for this project: ${snap.accuracy_rating}%`);
  if (snap.turn_count) parts.push(`Calibration exchanges: ${snap.turn_count}`);

  return parts.join('\n');
}
