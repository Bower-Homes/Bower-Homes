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
  return { supabase, userId: user.id };
}

export const GET: APIRoute = async ({ cookies }) => {
  const ctx = await verifyAdmin(cookies);
  if (!ctx) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });

  const { data, error } = await ctx.supabase
    .from('profiles')
    .select('id, full_name, email, active, created_at')
    .eq('role', 'admin')
    .order('created_at');

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const ctx = await verifyAdmin(cookies);
  if (!ctx) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });
  const { supabase } = ctx;

  const { email, password, full_name } = await request.json();
  if (!email || !password || !full_name) {
    return new Response(JSON.stringify({ error: 'Nombre, email y contraseña son requeridos' }), { status: 400 });
  }
  if (String(password).length < 8) {
    return new Response(JSON.stringify({ error: 'La contraseña debe tener al menos 8 caracteres' }), { status: 400 });
  }

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  });
  if (authError) return new Response(JSON.stringify({ error: authError.message }), { status: 400 });

  // El perfil normalmente lo crea un trigger con role 'client'; el upsert
  // cubre por igual promoverlo y crearlo si el trigger no existiera.
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert(
      { id: authData.user.id, email, full_name, role: 'admin', active: true },
      { onConflict: 'id' }
    );

  if (profileError) {
    // Sin perfil de admin la cuenta no sirve para nada: se revierte.
    await supabase.auth.admin.deleteUser(authData.user.id);
    return new Response(JSON.stringify({ error: profileError.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ id: authData.user.id }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const PUT: APIRoute = async ({ request, cookies }) => {
  const ctx = await verifyAdmin(cookies);
  if (!ctx) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });
  const { supabase, userId } = ctx;

  const { id, active } = await request.json();
  if (!id || active === undefined) {
    return new Response(JSON.stringify({ error: 'ID y estado requeridos' }), { status: 400 });
  }

  if (id === userId && !active) {
    return new Response(JSON.stringify({ error: 'No puedes desactivarte a ti mismo' }), { status: 400 });
  }

  // Nunca dejar el panel sin ningún administrador activo: es exactamente el
  // escenario de bloqueo que este panel existe para evitar.
  if (!active) {
    const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'admin')
      .eq('active', true);
    if ((count ?? 0) <= 1) {
      return new Response(JSON.stringify({ error: 'No puedes desactivar al único administrador activo' }), { status: 400 });
    }
  }

  const { data: updated, error } = await supabase
    .from('profiles')
    .update({ active: !!active })
    .eq('id', id)
    .eq('role', 'admin')
    .select('id, active')
    .maybeSingle();

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  if (!updated) return new Response(JSON.stringify({ error: 'No se encontró el administrador' }), { status: 404 });

  return new Response(JSON.stringify({ success: true, active: updated.active }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
