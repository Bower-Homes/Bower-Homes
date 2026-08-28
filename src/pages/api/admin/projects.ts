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

  if (Object.keys(filtered).length === 0) {
    return new Response(JSON.stringify({ error: 'Nada que actualizar' }), { status: 400 });
  }

  if (filtered.status !== undefined && !['active', 'paused', 'completed'].includes(filtered.status)) {
    return new Response(JSON.stringify({ error: 'Estado inválido' }), { status: 400 });
  }

  // El .select() distingue "actualicé la fila" de "no encontré ninguna":
  // sin él un update que no toca nada devuelve error null y parece exitoso.
  const { data: updated, error } = await supabase
    .from('projects')
    .update(filtered)
    .eq('id', id)
    .select('id, status')
    .maybeSingle();

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  if (!updated) {
    return new Response(JSON.stringify({ error: 'No se encontró el proyecto o no se pudo actualizar' }), { status: 404 });
  }

  return new Response(JSON.stringify({ success: true, status: updated.status }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

// Tablas hijas de un proyecto. El orden importa: se borran antes que el proyecto
// por si alguna FK no tiene ON DELETE CASCADE.
const PROJECT_CHILD_TABLES = [
  'investor_terms',
  'transactions',
  'documents',
  'photos',
  'stages',
  'cameras',
  'project_clients',
] as const;

export const DELETE: APIRoute = async ({ request, cookies }) => {
  const supabase = await verifyAdmin(cookies);
  if (!supabase) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });

  const { id, force, confirm_name } = await request.json();
  if (!id) return new Response(JSON.stringify({ error: 'ID requerido' }), { status: 400 });

  const { data: project } = await supabase
    .from('projects')
    .select('id, name')
    .eq('id', id)
    .maybeSingle();

  if (!project) return new Response(JSON.stringify({ error: 'Proyecto no encontrado' }), { status: 404 });

  const counts: Record<string, number> = {};
  await Promise.all(
    PROJECT_CHILD_TABLES.map(async (table) => {
      const { count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
        .eq('project_id', id);
      counts[table] = count ?? 0;
    })
  );

  // Primera barrera: nunca se borra en la primera llamada, ni siquiera un
  // proyecto vacío. La UI usa estos conteos para mostrar qué se va a perder.
  if (!force) {
    return new Response(JSON.stringify({ error: 'confirm_required', name: project.name, counts }), { status: 409 });
  }

  // Segunda barrera: hay que escribir el nombre exacto del proyecto.
  if (typeof confirm_name !== 'string' || confirm_name.trim() !== project.name.trim()) {
    return new Response(JSON.stringify({ error: 'El nombre no coincide. El proyecto no se eliminó.' }), { status: 400 });
  }

  for (const table of PROJECT_CHILD_TABLES) {
    const { error: cleanupError } = await supabase.from(table).delete().eq('project_id', id);
    if (cleanupError) {
      return new Response(JSON.stringify({ error: `Error al eliminar ${table}: ${cleanupError.message}` }), { status: 500 });
    }
  }

  const { data: deleted, error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle();

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  if (!deleted) {
    return new Response(JSON.stringify({ error: 'No se pudo eliminar el proyecto' }), { status: 500 });
  }

  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
