import type { APIRoute } from 'astro';
import { createSupabaseAdmin } from '../../../lib/supabase';

export const prerender = false;

async function recalculateRoiReal(supabase: any, projectId: string, clientId: string) {
  const { data: retornos } = await supabase
    .from('transactions')
    .select('amount')
    .eq('project_id', projectId)
    .eq('client_id', clientId)
    .eq('type', 'retorno');

  const totalRetornado = (retornos || []).reduce((sum: number, t: any) => sum + Number(t.amount), 0);

  const { data: pc } = await supabase
    .from('project_clients')
    .select('investment_amount')
    .eq('project_id', projectId)
    .eq('client_id', clientId)
    .single();

  const capital = Number(pc?.investment_amount || 0);
  const roiReal = capital > 0 ? ((totalRetornado - capital) / capital) * 100 : null;

  await supabase
    .from('investor_terms')
    .update({ roi_real: roiReal !== null ? Math.round(roiReal * 100) / 100 : null })
    .eq('project_id', projectId)
    .eq('client_id', clientId);
}

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
  const type = url.searchParams.get('type');
  if (!projectId) return new Response(JSON.stringify({ error: 'project_id requerido' }), { status: 400 });

  let query = supabase
    .from('transactions')
    .select('*, stages:stage_id(name, status, budget), profiles:client_id(full_name, email)')
    .eq('project_id', projectId)
    .order('date', { ascending: false });

  if (clientId) query = query.eq('client_id', clientId);
  if (type) query = query.eq('type', type);

  const { data, error } = await query;
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const supabase = await verifyAdmin(cookies);
  if (!supabase) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });

  const { project_id, client_id, type, stage_id, category_id, description, description_en, amount, date, payment_method, receipt_url, receipt_public_id, notes } = await request.json();

  if (!project_id || !type || !amount) {
    return new Response(JSON.stringify({ error: 'project_id, type y amount requeridos' }), { status: 400 });
  }

  if (type === 'gasto' && !stage_id) {
    return new Response(JSON.stringify({ error: 'El campo stage_id es obligatorio para gastos' }), { status: 400 });
  }

  const PM_MAP: Record<string, string> = {
    'Transferencia': 'Transferencia', 'Wire transfer': 'Transferencia', 'Wire Transfer': 'Transferencia',
    'Zelle': 'Zelle',
    'Cheque': 'Cheque', 'Check': 'Cheque',
    'Efectivo': 'Efectivo', 'Cash': 'Efectivo',
    'Otro': 'Otro', 'Other': 'Otro',
  };
  const normalizedPaymentMethod = payment_method ? (PM_MAP[payment_method] ?? null) : null;

  const { data, error } = await supabase
    .from('transactions')
    .insert({
      project_id,
      client_id: client_id || null,
      type,
      stage_id: stage_id || null,
      category_id: category_id || null,
      description: description || '',
      description_en: description_en || null,
      amount,
      date: date || new Date().toISOString().split('T')[0],
      payment_method: normalizedPaymentMethod,
      receipt_url: receipt_url || null,
      receipt_public_id: receipt_public_id || null,
      notes: notes || null,
    })
    .select('*, stages:stage_id(name, status, budget), profiles:client_id(full_name, email)')
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  if (type === 'retorno' && client_id) {
    await recalculateRoiReal(supabase, project_id, client_id);
  }

  if (type === 'gasto' && stage_id) {
    const { data: stage } = await supabase
      .from('stages')
      .select('status')
      .eq('id', stage_id)
      .single();
    if (stage?.status === 'pending') {
      await supabase.from('stages').update({ status: 'in_progress' }).eq('id', stage_id);
    }
  }

  return new Response(JSON.stringify(data), { status: 201, headers: { 'Content-Type': 'application/json' } });
};

// Solo edita las descripciones. Los montos, fechas y comprobantes no se
// tocan desde aquí: cambiarlos alteraría los totales del proyecto y el
// historial que ya vio el inversionista.
export const PUT: APIRoute = async ({ request, cookies }) => {
  const supabase = await verifyAdmin(cookies);
  if (!supabase) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });

  const { id, description, description_en } = await request.json();
  if (!id) return new Response(JSON.stringify({ error: 'ID requerido' }), { status: 400 });

  const updates: any = {};
  if (description !== undefined) updates.description = description || '';
  if (description_en !== undefined) updates.description_en = description_en || null;

  if (Object.keys(updates).length === 0) {
    return new Response(JSON.stringify({ error: 'Nada que actualizar' }), { status: 400 });
  }

  const { data: updated, error } = await supabase
    .from('transactions')
    .update(updates)
    .eq('id', id)
    .select('id')
    .maybeSingle();

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  if (!updated) return new Response(JSON.stringify({ error: 'No se encontró el movimiento' }), { status: 404 });

  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ request, cookies }) => {
  const supabase = await verifyAdmin(cookies);
  if (!supabase) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });

  const { id } = await request.json();
  if (!id) return new Response(JSON.stringify({ error: 'ID requerido' }), { status: 400 });

  const { data: tx } = await supabase.from('transactions').select('receipt_public_id').eq('id', id).single();

  if (tx?.receipt_public_id) {
    try {
      const CLOUD_NAME = import.meta.env.PUBLIC_CLOUDINARY_CLOUD_NAME;
      const API_KEY = import.meta.env.CLOUDINARY_API_KEY;
      const API_SECRET = import.meta.env.CLOUDINARY_API_SECRET;

      const timestamp = Math.floor(Date.now() / 1000).toString();
      const encoder = new TextEncoder();
      const data = encoder.encode(`public_id=${tx.receipt_public_id}&timestamp=${timestamp}${API_SECRET}`);
      const hashBuffer = await crypto.subtle.digest('SHA-1', data);
      const signature = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

      const form = new FormData();
      form.append('public_id', tx.receipt_public_id);
      form.append('timestamp', timestamp);
      form.append('api_key', API_KEY);
      form.append('signature', signature);

      await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/destroy`, { method: 'POST', body: form });
    } catch (e) {
      console.error('Error deleting from Cloudinary:', e);
    }
  }

  const { data: txDetail } = await supabase.from('transactions').select('project_id, client_id, type').eq('id', id).single();

  const { error } = await supabase.from('transactions').delete().eq('id', id);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  if (txDetail?.type === 'retorno' && txDetail?.client_id) {
    await recalculateRoiReal(supabase, txDetail.project_id, txDetail.client_id);
  }

  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
