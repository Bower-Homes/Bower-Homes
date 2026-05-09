import type { APIRoute } from 'astro';
import { createSupabaseClient, createSupabaseAdmin } from '../../../lib/supabase';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Email y contraseña requeridos' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabase = createSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      console.error('[login] Supabase auth error:', error.message, '| status:', error.status);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 401, headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createSupabaseAdmin();
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role, active, full_name')
      .eq('id', data.user.id)
      .single();

    if (!profile?.active) {
      return new Response(JSON.stringify({ error: 'Cuenta desactivada' }), {
        status: 403, headers: { 'Content-Type': 'application/json' },
      });
    }

    cookies.set('sb-access-token', data.session.access_token, {
      path: '/', httpOnly: true, secure: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 7,
    });
    cookies.set('sb-refresh-token', data.session.refresh_token, {
      path: '/', httpOnly: true, secure: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 30,
    });

    const redirect = profile.role === 'admin' ? '/portal/admin/' : '/portal/cliente/';
    return new Response(JSON.stringify({ redirect, role: profile.role }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Error del servidor' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
};
