import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL ?? import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_ANON_KEY
  ?? import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ?? import.meta.env.SUPABASE_PUBLISHABLE_KEY;
const supabaseServiceKey = import.meta.env.SUPABASE_SECRET_KEY
  ?? import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

export function createSupabaseClient(accessToken?: string) {
  return createClient(supabaseUrl, supabaseAnonKey, {
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
