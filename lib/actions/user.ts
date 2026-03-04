import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export async function upsertUser(githubUser: {
  id: string;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
}) {
  try {
    const result = await pool.query(
      `INSERT INTO users (github_id, github_login, name, email, avatar_url, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (github_id) DO UPDATE
       SET email = EXCLUDED.email,
           name = EXCLUDED.name,
           avatar_url = EXCLUDED.avatar_url,
           updated_at = NOW()
       RETURNING id`,
      [githubUser.id, githubUser.login, githubUser.name, githubUser.email, githubUser.avatar_url]
    );
    
    return { success: true, user: result.rows[0] };
  } catch (err) {
    console.error("upsertUser failed:", err);
    return { success: false };
  }
}