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

  const id = url.searchParams.get('id');

  if (id) {
    const { data, error } = await supabase
      .from('projects')
      .select(`*, project_clients(client_id, profiles:client_id(full_name, email)), stages(*, photos(count)), documents(count), photos(count), cameras(*)`)
      .eq('id', id)
      .single();
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
  }

  const { data, error } = await supabase
    .from('projects')
    .select(`*, project_clients(client_id, profiles:client_id(full_name, email)), stages(id, progress, status)`)
    .order('created_at', { ascending: false });

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const supabase = await verifyAdmin(cookies);
  if (!supabase) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });

  const body = await request.json();
  const { name, address, model, estimated_delivery, client_id, stages } = body;

  if (!name) return new Response(JSON.stringify({ error: 'Nombre requerido' }), { status: 400 });

  const { data: project, error } = await supabase
    .from('projects')
    .insert({ name, address, model, estimated_delivery })
    .select()
    .single();

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  if (client_id) {
    await supabase.from('project_clients').insert({ project_id: project.id, client_id });
  }

  if (stages?.length) {
    const stageRows = stages.map((s: any, i: number) => ({
      project_id: project.id,
      name: s.name,
      description: s.description || '',
      order_index: i,
    }));
    await supabase.from('stages').insert(stageRows);
  }

  return new Response(JSON.stringify(project), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const PUT: APIRoute = async ({ request, cookies }) => {
  const supabase = await verifyAdmin(cookies);
  if (!supabase) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });

  const body = await request.json();
  const { id, ...updates } = body;
  if (!id) return new Response(JSON.stringify({ error: 'ID requerido' }), { status: 400 });

  const allowed = ['name', 'address', 'model', 'estimated_delivery', 'status', 'expenses_excel_url', 'sale_price'];
  const filtered: any = {};
  for (const key of allowed) {
    if (updates[key] !== undefined) filtered[key] = updates[key];
  }

  if (Object.keys(filtered).length > 0) {
    const { error } = await supabase.from('projects').update(filtered).eq('id', id);
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ request, cookies }) => {
  const supabase = await verifyAdmin(cookies);
  if (!supabase) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });

  const { id } = await request.json();
  if (!id) return new Response(JSON.stringify({ error: 'ID requerido' }), { status: 400 });

  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
