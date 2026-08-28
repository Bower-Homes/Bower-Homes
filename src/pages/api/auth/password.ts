import type { APIRoute } from 'astro';
import { createSupabaseClient, createSupabaseAdmin } from '../../../lib/supabase';

export const prerender = false;

const MIN_LENGTH = 8;

// Cambia la contraseña del usuario que está logueado (admin o cliente).
// Pide la contraseña actual para que una sesión robada no baste para
// apoderarse de la cuenta.
export const PUT: APIRoute = async ({ request, cookies }) => {
  const token = cookies.get('sb-access-token')?.value;
  if (!token) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });

  const supabaseAdmin = createSupabaseAdmin();
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user?.email) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });

  const { current_password, new_password } = await request.json();

  if (!current_password || !new_password) {
    return new Response(JSON.stringify({ error: 'Completa los tres campos' }), { status: 400 });
  }
  if (String(new_password).length < MIN_LENGTH) {
    return new Response(JSON.stringify({ error: `La contraseña nueva debe tener al menos ${MIN_LENGTH} caracteres` }), { status: 400 });
  }
  if (current_password === new_password) {
    return new Response(JSON.stringify({ error: 'La contraseña nueva debe ser distinta de la actual' }), { status: 400 });
  }

  // Verificar la contraseña actual haciendo un login real contra Supabase.
  const supabase = createSupabaseClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: current_password,
  });
  if (signInError) {
    return new Response(JSON.stringify({ error: 'La contraseña actual no es correcta' }), { status: 400 });
  }

  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
    password: new_password,
  });
  if (updateError) {
    return new Response(JSON.stringify({ error: updateError.message }), { status: 500 });
  }

  // Cambiar la contraseña invalida los refresh tokens existentes. Volvemos a
  // iniciar sesión con la nueva y reescribimos las cookies para que el admin
  // no quede deslogueado a mitad de trabajo.
  const { data: session } = await createSupabaseClient().auth.signInWithPassword({
    email: user.email,
    password: new_password,
  });

  if (session?.session) {
    cookies.set('sb-access-token', session.session.access_token, {
      path: '/', httpOnly: true, secure: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 7,
    });
    cookies.set('sb-refresh-token', session.session.refresh_token, {
      path: '/', httpOnly: true, secure: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 30,
    });
  }

  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
