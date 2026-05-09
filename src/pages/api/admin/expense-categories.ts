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

  const { data, error } = await supabase
    .from('expense_categories')
    .select('*')
    .order('is_default', { ascending: false })
    .order('name');

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const supabase = await verifyAdmin(cookies);
  if (!supabase) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });

  const { name } = await request.json();
  if (!name) return new Response(JSON.stringify({ error: 'Nombre requerido' }), { status: 400 });

  const { data, error } = await supabase
    .from('expense_categories')
    .insert({ name, is_default: false })
    .select()
    .single();

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify(data), { status: 201, headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ request, cookies }) => {
  const supabase = await verifyAdmin(cookies);
  if (!supabase) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });

  const { id } = await request.json();
  if (!id) return new Response(JSON.stringify({ error: 'ID requerido' }), { status: 400 });

  const { data: cat } = await supabase.from('expense_categories').select('is_default').eq('id', id).single();
  if (cat?.is_default) return new Response(JSON.stringify({ error: 'No se puede eliminar una categoría predeterminada' }), { status: 400 });

  const { count } = await supabase.from('transactions').select('*', { count: 'exact', head: true }).eq('category_id', id);
  if (count && count > 0) return new Response(JSON.stringify({ error: 'Categoría tiene transacciones asociadas' }), { status: 400 });

  const { error } = await supabase.from('expense_categories').delete().eq('id', id);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
