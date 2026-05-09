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

export const GET: APIRoute = async ({ cookies, url }) => {
  const supabase = await verifyAdmin(cookies);
  if (!supabase) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });

  const projectId = url.searchParams.get('project_id');
  const clientId = url.searchParams.get('client_id');
  if (!projectId) return new Response(JSON.stringify({ error: 'project_id requerido' }), { status: 400 });

  let query = supabase
    .from('investor_terms')
    .select('*, profiles:client_id(full_name, email)')
    .eq('project_id', projectId);

  if (clientId) query = query.eq('client_id', clientId);

  const { data, error } = await query;
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const supabase = await verifyAdmin(cookies);
  if (!supabase) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });

  const { project_id, client_id, roi_min, roi_max, return_date, status } = await request.json();
  if (!project_id || !client_id) return new Response(JSON.stringify({ error: 'project_id y client_id requeridos' }), { status: 400 });

  const { data, error } = await supabase
    .from('investor_terms')
    .insert({
      project_id,
      client_id,
      roi_min: roi_min || null,
      roi_max: roi_max || null,
      roi_real: null,
      return_date: return_date || null,
      status: status || 'activo',
    })
    .select('*, profiles:client_id(full_name, email)')
    .single();

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify(data), { status: 201, headers: { 'Content-Type': 'application/json' } });
};

export const PUT: APIRoute = async ({ request, cookies }) => {
  const supabase = await verifyAdmin(cookies);
  if (!supabase) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });

  const { id, roi_min, roi_max, return_date, status } = await request.json();
  if (!id) return new Response(JSON.stringify({ error: 'ID requerido' }), { status: 400 });

  const updates: any = {};
  if (roi_min !== undefined) updates.roi_min = roi_min;
  if (roi_max !== undefined) updates.roi_max = roi_max;
  if (return_date !== undefined) updates.return_date = return_date || null;
  if (status !== undefined) updates.status = status;

  const { error } = await supabase.from('investor_terms').update(updates).eq('id', id);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
