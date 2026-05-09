import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ cookies }) => {
  cookies.delete('sb-access-token', { path: '/' });
  cookies.delete('sb-refresh-token', { path: '/' });
  return new Response(JSON.stringify({ redirect: '/portal/login' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
