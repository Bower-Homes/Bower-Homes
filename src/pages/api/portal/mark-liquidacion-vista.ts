// POST /api/portal/mark-liquidacion-vista
// Marks liquidacion_vista = true for the authenticated investor's investor_terms row.
// Requires SQL migration: ALTER TABLE investor_terms ADD COLUMN IF NOT EXISTS liquidacion_vista boolean DEFAULT false;
import type { APIRoute } from 'astro';
import { createSupabaseAdmin } from '../../../lib/supabase';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  const token = cookies.get('sb-access-token')?.value;
  if (!token) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });

  const supabase = createSupabaseAdmin();
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { project_id } = body;
  if (!project_id) return new Response(JSON.stringify({ error: 'project_id requerido' }), { status: 400 });

  const { error } = await supabase
    .from('investor_terms')
    .update({ liquidacion_vista: true })
    .eq('client_id', user.id)
    .eq('project_id', project_id);

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
