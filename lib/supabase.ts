import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// These public values are supplied by GitHub Actions at build time.
// Supabase RLS remains responsible for authorization and data protection.
export const supabase = createClient(
  supabaseUrl as string,
  supabaseAnonKey as string,
);

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
