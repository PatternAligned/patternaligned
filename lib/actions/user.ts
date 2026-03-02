'use server';

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function upsertUser(githubUser: {
  id: string;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
}) {
  try {
    const { data, error } = await supabase
      .from('users')
      .upsert(
        {
          github_id: githubUser.id,
          github_login: githubUser.login,
          name: githubUser.name,
          email: githubUser.email,
          avatar_url: githubUser.avatar_url,
          last_login_at: new Date().toISOString(),
        },
        {
          onConflict: 'github_id', // If github_id exists, update it
        }
      )
      .select();

    if (error) {
      console.error('Error upserting user:', error);
      return { success: false, error: error.message };
    }

    return { success: true, user: data[0] };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: 'Failed to save user' };
  }
}