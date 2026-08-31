import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Public browser credentials are injected by GitHub Actions at build time.
// RLS remains responsible for authorization. Explicit auth options keep the
// admin session refreshed instead of leaving an expired JWT in local storage.
export const supabase = createClient(
  supabaseUrl as string,
  supabaseAnonKey as string,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      storageKey: 'vibhu-portfolio-auth',
    },
  },
);

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export async function ensureFreshSession(){
  if(!supabase)return null;
  const {data:{session}}=await supabase.auth.getSession();
  if(!session)return null;
  const expiresAt=(session.expires_at||0)*1000;
  if(expiresAt-Date.now()<90_000){
    const {data,error}=await supabase.auth.refreshSession();
    if(error)return null;
    return data.session;
  }
  return session;
}

export function isJwtExpiredError(error:any){
  const message=String(error?.message||error||'').toLowerCase();
  return message.includes('jwt expired')||message.includes('token is expired')||message.includes('invalid jwt');
}
