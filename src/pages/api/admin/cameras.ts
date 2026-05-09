import type { APIRoute } from 'astro';
import { createSupabaseAdmin } from '../../../lib/supabase';

export const prerender = false;

async function verifyAdmin(cookies: any) {
  const token = cookies.get('sb-access-token')?.value;
  if (!token) return null;
  const supabase = createSupabaseAdmin();
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return null;
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return null;
  return supabase;
}

export const PUT: APIRoute = async ({ request, cookies }) => {
  const supabase = await verifyAdmin(cookies);
  if (!supabase) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });

  const { project_id, app_name, username, password, server, app_store_url, play_store_url } = await request.json();
  if (!project_id) return new Response(JSON.stringify({ error: 'project_id requerido' }), { status: 400 });

  const { data: existing } = await supabase
    .from('cameras')
    .select('id')
    .eq('project_id', project_id)
    .single();

  if (existing) {
    const { error } = await supabase
      .from('cameras')
      .update({ app_name, username, password, server, app_store_url, play_store_url })
      .eq('id', existing.id);
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  } else {
    const { error } = await supabase
      .from('cameras')
      .insert({ project_id, app_name, username, password, server, app_store_url, play_store_url });
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
