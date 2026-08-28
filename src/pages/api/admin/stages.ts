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
  if (!projectId) return new Response(JSON.stringify({ error: 'project_id requerido' }), { status: 400 });

  const { data, error } = await supabase
    .from('stages')
    .select('*, photos(id, cloudinary_url, caption)')
    .eq('project_id', projectId)
    .order('order_index');

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const supabase = await verifyAdmin(cookies);
  if (!supabase) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });

  const { project_id, name, name_en, description, description_en, budget, is_sale_stage } = await request.json();
  if (!project_id || !name) return new Response(JSON.stringify({ error: 'project_id y name requeridos' }), { status: 400 });

  if (budget !== undefined && budget !== null) {
    const b = Number(budget);
    if (isNaN(b) || b < 0) return new Response(JSON.stringify({ error: 'El presupuesto debe ser un número mayor o igual a cero' }), { status: 400 });
  }

  const { data: existing } = await supabase
    .from('stages')
    .select('order_index')
    .eq('project_id', project_id)
    .order('order_index', { ascending: false })
    .limit(1);

  const nextOrder = existing?.length ? existing[0].order_index + 1 : 0;

  const { data, error } = await supabase
    .from('stages')
    .insert({ project_id, name, name_en: name_en || null, description: description || '', description_en: description_en || null, order_index: nextOrder, budget: budget ?? null, is_sale_stage: is_sale_stage ?? false })
    .select()
    .single();

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify(data), { status: 201, headers: { 'Content-Type': 'application/json' } });
};

export const PUT: APIRoute = async ({ request, cookies }) => {
  const supabase = await verifyAdmin(cookies);
  if (!supabase) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });

  const body = await request.json();

  // Batch reorder
  if (body.reorder && Array.isArray(body.stages)) {
    const items = body.stages;
    for (const s of items) {
      if (!s?.id || typeof s.order_index !== 'number' || !Number.isInteger(s.order_index) || s.order_index < 0) {
        return new Response(JSON.stringify({ error: 'Orden inválido' }), { status: 400 });
      }
    }
    const results = await Promise.all(
      items.map((s: any) => supabase.from('stages').update({ order_index: s.order_index }).eq('id', s.id))
    );
    const failed = results.find((r: any) => r.error);
    if (failed) return new Response(JSON.stringify({ error: failed.error.message }), { status: 500 });
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  }

  const { id, name, name_en, description, description_en, progress, status, budget, is_sale_stage } = body;
  if (!id) return new Response(JSON.stringify({ error: 'ID requerido' }), { status: 400 });

  if (budget !== undefined && budget !== null) {
    const b = Number(budget);
    if (isNaN(b) || b < 0) return new Response(JSON.stringify({ error: 'El presupuesto debe ser un número mayor o igual a cero' }), { status: 400 });
  }

  const updates: any = {};
  if (name !== undefined) updates.name = name;
  if (name_en !== undefined) updates.name_en = name_en || null;
  if (description !== undefined) updates.description = description;
  if (description_en !== undefined) updates.description_en = description_en || null;
  if (progress !== undefined) {
    updates.progress = Math.min(100, Math.max(0, progress));
    if (updates.progress === 100) {
      updates.status = 'completed'; // 100% always forces completed, ignores explicit status
    } else if (status !== undefined) {
      updates.status = status;
    } else if (updates.progress > 0) {
      updates.status = 'in_progress';
    } else {
      updates.status = 'pending';
    }
  } else if (status !== undefined) {
    updates.status = status;
  }
  if (budget !== undefined) updates.budget = budget !== null ? Number(budget) : null;
  if (is_sale_stage !== undefined) updates.is_sale_stage = !!is_sale_stage;

  const { error } = await supabase.from('stages').update(updates).eq('id', id);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ request, cookies }) => {
  const supabase = await verifyAdmin(cookies);
  if (!supabase) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });

  const { id } = await request.json();
  if (!id) return new Response(JSON.stringify({ error: 'ID requerido' }), { status: 400 });

  const { error } = await supabase.from('stages').delete().eq('id', id);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
