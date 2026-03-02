// lib/supabase.js
// Supabase client initialization
// WHY: This creates your connection to the database
// You'll use supabase.from().select() to query data
// Automatically includes auth headers from NextAuth session

import { createClient } from "@supabase/supabase-js";
import { useSession } from "next-auth/react";

// Server-side Supabase client (has full database access)
// Use this in API routes only
export const supabaseServer = process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('https://')
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY // Secret key - server only
    )
  : null;

// Client-side Supabase client (limited by RLS policies)
// Use this in React components
// The anon key is safe to expose (public)
export const supabaseClient = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('https://')
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
  : null;

// Hook: Get authenticated Supabase client in components
// Automatically adds user ID to queries (RLS restricts to own data)
export function useSupabase() {
  const { data: session } = useSession();

  return {
    client: supabaseClient,
    userId: session?.user?.id,
    isAuthenticated: !!session,
  };
}

// Helper: Fetch current user's messages
export async function getUserMessages(userId, limit = 50) {
  const { data, error } = await supabaseClient
    .from("messages")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

// Helper: Insert a new message
export async function insertMessage(userId, message) {
  const { data, error } = await supabaseClient
    .from("messages")
    .insert({
      user_id: userId,
      ...message,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Helper: Get user's behavioral fingerprint
export async function getUserFingerprint(userId) {
  const { data, error } = await supabaseClient
    .from("user_behavioral_fingerprints")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error && error.code !== "PGRST116") {
    // PGRST116 = no rows found (ok for new users)
    throw error;
  }

  return data || null;
}

// Helper: Get user's activity stats (for dashboard)
export async function getUserActivityStats(userId) {
  const { data, error } = await supabaseClient
    .from("user_activity_stats")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error && error.code !== "PGRST116") {
    throw error;
  }

  return data || null;
}

// Helper: Subscribe to real-time messages
// Useful for live chat updates
export function subscribeToMessages(userId, callback) {
  const subscription = supabaseClient
    .from("messages")
    .on("*", (payload) => {
      if (payload.new?.user_id === userId) {
        callback(payload);
      }
    })
    .subscribe();

  return subscription;
}

// Helper: Subscribe to behavioral events (for analytics)
export function subscribeToBehavioralEvents(userId, callback) {
  const subscription = supabaseClient
    .from("behavioral_events")
    .on("*", (payload) => {
      if (payload.new?.user_id === userId) {
        callback(payload);
      }
    })
    .subscribe();

  return subscription;
}