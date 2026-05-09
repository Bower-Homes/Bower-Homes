import type { APIRoute } from 'astro';
import { createSupabaseAdmin } from '../../lib/supabase';

export const prerender = false;

const CLOUD_NAME = (import.meta.env.PUBLIC_CLOUDINARY_CLOUD_NAME ?? process.env.PUBLIC_CLOUDINARY_CLOUD_NAME ?? process.env.CLOUDINARY_CLOUD_NAME) as string;
const API_KEY = (import.meta.env.CLOUDINARY_API_KEY ?? process.env.CLOUDINARY_API_KEY) as string;
const API_SECRET = (import.meta.env.CLOUDINARY_API_SECRET ?? process.env.CLOUDINARY_API_SECRET) as string;

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function sha1(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function verifyAdmin(cookies: any) {
  const token = cookies.get('sb-access-token')?.value;
  if (!token) return false;
  const supabase = createSupabaseAdmin();
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return false;
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  return profile?.role === 'admin';
}

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!(await verifyAdmin(cookies))) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const projectName = formData.get('projectName') as string;
    const baseFolder = (formData.get('folder') as string) || 'bower/fotos';

    // Build folder path: if projectName is provided, organize by project
    let folder = baseFolder;
    if (projectName) {
      const slug = slugify(projectName);
      if (baseFolder.includes('documentos')) {
        folder = `bower/proyectos/${slug}/documentos`;
      } else {
        folder = `bower/proyectos/${slug}/fotos`;
      }
    }

    if (!file) {
      return new Response(JSON.stringify({ error: 'Archivo requerido' }), { status: 400 });
    }

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const paramsToSign = `folder=${folder}&timestamp=${timestamp}${API_SECRET}`;
    const signature = await sha1(paramsToSign);

    const uploadForm = new FormData();
    uploadForm.append('file', file);
    uploadForm.append('folder', folder);
    uploadForm.append('timestamp', timestamp);
    uploadForm.append('api_key', API_KEY);
    uploadForm.append('signature', signature);

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`,
      { method: 'POST', body: uploadForm }
    );

    const result = await res.json();
    if (!res.ok) {
      return new Response(JSON.stringify({ error: result.error?.message || 'Error de Cloudinary' }), { status: 500 });
    }

    return new Response(JSON.stringify({
      url: result.secure_url,
      public_id: result.public_id,
      format: result.format,
      bytes: result.bytes,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Error al subir archivo' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const DELETE: APIRoute = async ({ request, cookies }) => {
  if (!(await verifyAdmin(cookies))) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });
  }

  try {
    const { public_id } = await request.json();
    if (!public_id) {
      return new Response(JSON.stringify({ error: 'public_id requerido' }), { status: 400 });
    }

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const paramsToSign = `public_id=${public_id}&timestamp=${timestamp}${API_SECRET}`;
    const signature = await sha1(paramsToSign);

    const form = new FormData();
    form.append('public_id', public_id);
    form.append('timestamp', timestamp);
    form.append('api_key', API_KEY);
    form.append('signature', signature);

    await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/destroy`,
      { method: 'POST', body: form }
    );

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
