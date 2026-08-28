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

// Sin caracteres ambiguos (0/O, 1/l/I): esta contraseña se dicta por WhatsApp.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

function generateTempPassword(length = 14) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = '';
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return out;
}

// Genera una contraseña temporal para cualquier usuario y la devuelve una
// sola vez. Es la vía de recuperación cuando el correo del usuario no sirve
// para recibir el link estándar de Supabase.
export const POST: APIRoute = async ({ request, cookies }) => {
  const supabase = await verifyAdmin(cookies);
  if (!supabase) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });

  const { id } = await request.json();
  if (!id) return new Response(JSON.stringify({ error: 'ID requerido' }), { status: 400 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, email, role')
    .eq('id', id)
    .maybeSingle();

  if (!profile) return new Response(JSON.stringify({ error: 'Usuario no encontrado' }), { status: 404 });

  const password = generateTempPassword();

  const { error } = await supabase.auth.admin.updateUserById(id, { password });
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  return new Response(
    JSON.stringify({ success: true, password, name: profile.full_name || profile.email }),
    { headers: { 'Content-Type': 'application/json' } }
  );
};
