import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

function getEnv(key: string): string {
  return (import.meta.env[key] ?? process.env[key] ?? '') as string;
}

const supabaseUrl = getEnv('SUPABASE_URL') || getEnv('PUBLIC_SUPABASE_URL');
const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY') || getEnv('SUPABASE_PUBLISHABLE_KEY') || getEnv('PUBLIC_SUPABASE_PUBLISHABLE_KEY');
const supabaseServiceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('SUPABASE_SECRET_KEY');

export function createSupabaseClient(accessToken?: string) {
  const url = supabaseUrl;
  const key = supabaseAnonKey;
  console.log('[supabase] url:', url?.slice(0, 30), '| anonKey:', key?.slice(0, 20));
  return createClient(url, key, {
    global: {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    },
    realtime: { transport: ws },
  });
}

export function createSupabaseAdmin() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    realtime: { transport: ws },
  });
}
