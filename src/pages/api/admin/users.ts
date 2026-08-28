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

export const GET: APIRoute = async ({ cookies }) => {
  const supabase = await verifyAdmin(cookies);
  if (!supabase) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });

  const { data: clients, error } = await supabase
    .from('profiles')
    .select(`*, project_clients(project_id, projects:project_id(name))`)
    .eq('role', 'client')
    .order('created_at', { ascending: false });

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify(clients), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const supabase = await verifyAdmin(cookies);
  if (!supabase) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });

  const { email, password, full_name, phone } = await request.json();

  if (!email || !password || !full_name) {
    return new Response(JSON.stringify({ error: 'Nombre, email y contraseña son requeridos' }), { status: 400 });
  }

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  });

  if (authError) {
    return new Response(JSON.stringify({ error: authError.message }), { status: 400 });
  }

  if (phone) {
    await supabase.from('profiles').update({ phone }).eq('id', authData.user.id);
  }

  return new Response(JSON.stringify({ id: authData.user.id }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const PUT: APIRoute = async ({ request, cookies }) => {
  const supabase = await verifyAdmin(cookies);
  if (!supabase) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });

  const { id, full_name, phone, active } = await request.json();
  if (!id) return new Response(JSON.stringify({ error: 'ID requerido' }), { status: 400 });

  const updates: any = {};
  if (full_name !== undefined) updates.full_name = full_name;
  if (phone !== undefined) updates.phone = phone;
  if (active !== undefined) updates.active = !!active;

  if (Object.keys(updates).length === 0) {
    return new Response(JSON.stringify({ error: 'Nada que actualizar' }), { status: 400 });
  }

  // .eq('role','client') evita que un admin se desactive a sí mismo desde este panel.
  // El .select() es necesario: sin él un update que no toca ninguna fila
  // devuelve error null y la UI reporta un éxito que nunca ocurrió.
  const { data: updated, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', id)
    .eq('role', 'client')
    .select('id, active')
    .maybeSingle();

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  if (!updated) {
    return new Response(JSON.stringify({ error: 'No se encontró el cliente o no se pudo actualizar' }), { status: 404 });
  }

  return new Response(JSON.stringify({ success: true, active: updated.active }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const DELETE: APIRoute = async ({ request, cookies }) => {
  const supabase = await verifyAdmin(cookies);
  if (!supabase) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });

  const { id, force } = await request.json();
  if (!id) return new Response(JSON.stringify({ error: 'ID requerido' }), { status: 400 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, full_name')
    .eq('id', id)
    .maybeSingle();

  if (!profile) return new Response(JSON.stringify({ error: 'Cliente no encontrado' }), { status: 404 });
  if (profile.role !== 'client') {
    return new Response(JSON.stringify({ error: 'Solo se pueden eliminar clientes' }), { status: 403 });
  }

  const headCount = (table: string) =>
    supabase.from(table).select('*', { count: 'exact', head: true }).eq('client_id', id);

  const [pcRes, txRes, termsRes, docsRes] = await Promise.all([
    headCount('project_clients'),
    headCount('transactions'),
    headCount('investor_terms'),
    headCount('documents'),
  ]);

  const counts = {
    projects: pcRes.count ?? 0,
    transactions: txRes.count ?? 0,
    terms: termsRes.count ?? 0,
    documents: docsRes.count ?? 0,
  };
  const totalLinked = counts.projects + counts.transactions + counts.terms + counts.documents;

  // Sin force, un cliente con historial no se borra: el admin debe confirmar
  // qué se va a perder. La UI usa estos conteos para el segundo confirm.
  if (totalLinked > 0 && !force) {
    return new Response(JSON.stringify({ error: 'has_records', counts }), { status: 409 });
  }

  if (totalLinked > 0) {
    // Los documentos con client_id son privados de ese inversionista: se borran,
    // no se dejan sueltos con client_id null (quedarían visibles para todo el proyecto).
    for (const table of ['investor_terms', 'project_clients', 'transactions', 'documents']) {
      const { error: cleanupError } = await supabase.from(table).delete().eq('client_id', id);
      if (cleanupError) {
        return new Response(JSON.stringify({ error: `Error al limpiar ${table}: ${cleanupError.message}` }), { status: 500 });
      }
    }
  }

  const { error: authError } = await supabase.auth.admin.deleteUser(id);
  if (authError) return new Response(JSON.stringify({ error: authError.message }), { status: 500 });

  // Si el perfil no cae por cascada al borrar el usuario de auth, lo borramos aquí.
  await supabase.from('profiles').delete().eq('id', id);

  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
