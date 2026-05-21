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

  const { data: pcs, error } = await supabase
    .from('project_clients')
    .select('*, profiles:client_id(full_name, email)')
    .eq('project_id', projectId);

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  const { data: terms } = await supabase
    .from('investor_terms')
    .select('*')
    .eq('project_id', projectId);

  const merged = (pcs || []).map((pc: any) => {
    const t = (terms || []).find((it: any) => it.client_id === pc.client_id);
    return { ...pc, investor_terms: t || null };
  });

  return new Response(JSON.stringify(merged), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const supabase = await verifyAdmin(cookies);
  if (!supabase) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });

  const { project_id, client_id, investment_amount, investment_product, roi_min, roi_max, return_date, show_expenses } = await request.json();
  if (!project_id || !client_id) {
    return new Response(JSON.stringify({ error: 'project_id y client_id requeridos' }), { status: 400 });
  }

  const { data, error } = await supabase
    .from('project_clients')
    .insert({ project_id, client_id, investment_amount: investment_amount || null, investment_product: investment_product || null })
    .select('*, profiles:client_id(full_name, email)')
    .single();

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  const { data: terms, error: termsError } = await supabase
    .from('investor_terms')
    .insert({
      project_id,
      client_id,
      roi_min: roi_min || null,
      roi_max: roi_max || null,
      roi_real: null,
      return_date: return_date || null,
      status: 'activo',
      show_expenses: show_expenses === true,
    })
    .select()
    .single();

  if (termsError) console.error('Error creating investor_terms:', termsError.message);

  return new Response(JSON.stringify({ ...data, investor_terms: terms || null }), { status: 201, headers: { 'Content-Type': 'application/json' } });
};

export const PUT: APIRoute = async ({ request, cookies }) => {
  const supabase = await verifyAdmin(cookies);
  if (!supabase) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });

  const { project_id, client_id, investment_amount, investment_product, roi_min, roi_max, return_date, terms_id, show_expenses } = await request.json();
  if (!project_id || !client_id) {
    return new Response(JSON.stringify({ error: 'project_id y client_id requeridos' }), { status: 400 });
  }

  const pcUpdates: any = {};
  if (investment_amount !== undefined) pcUpdates.investment_amount = investment_amount || null;
  if (investment_product !== undefined) pcUpdates.investment_product = investment_product || null;

  if (Object.keys(pcUpdates).length > 0) {
    const { error } = await supabase
      .from('project_clients')
      .update(pcUpdates)
      .eq('project_id', project_id)
      .eq('client_id', client_id);
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const termsUpdates: any = {};
  if (roi_min !== undefined) termsUpdates.roi_min = roi_min;
  if (roi_max !== undefined) termsUpdates.roi_max = roi_max;
  if (return_date !== undefined) termsUpdates.return_date = return_date || null;
  if (show_expenses !== undefined) termsUpdates.show_expenses = show_expenses === true;

  if (Object.keys(termsUpdates).length > 0) {
    const termsQuery = terms_id
      ? supabase.from('investor_terms').update(termsUpdates).eq('id', terms_id)
      : supabase.from('investor_terms').update(termsUpdates).eq('project_id', project_id).eq('client_id', client_id);
    const { error: termsError } = await termsQuery;
    if (termsError) return new Response(JSON.stringify({ error: termsError.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ request, cookies }) => {
  const supabase = await verifyAdmin(cookies);
  if (!supabase) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });

  const { project_id, client_id } = await request.json();
  if (!project_id || !client_id) {
    return new Response(JSON.stringify({ error: 'project_id y client_id requeridos' }), { status: 400 });
  }

  await supabase.from('investor_terms').delete().eq('project_id', project_id).eq('client_id', client_id);

  const { error } = await supabase
    .from('project_clients')
    .delete()
    .eq('project_id', project_id)
    .eq('client_id', client_id);

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
