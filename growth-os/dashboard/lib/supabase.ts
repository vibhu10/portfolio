'use client';

import {createClient} from '@supabase/supabase-js';

const url=process.env.NEXT_PUBLIC_SUPABASE_URL||'';
const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||'';
export const configured=!!url&&!!key;
export const supabase=createClient(url||'https://placeholder.supabase.co',key||'placeholder',{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'pkce',storageKey:'vibhu-growth-os-auth'}});
