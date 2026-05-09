import { defineMiddleware } from 'astro:middleware';
import { createSupabaseAdmin } from './lib/supabase';

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  const isPortalAdmin = pathname.startsWith('/portal/admin');
  const isPortalClient = pathname.startsWith('/portal/cliente');
  const isPortalLogin = pathname === '/portal/login';

  if (!isPortalAdmin && !isPortalClient && !isPortalLogin) {
    return next();
  }

  // Bower Portal is ES only
  context.locals.lang = 'es';

  const accessToken = context.cookies.get('sb-access-token')?.value;
  const refreshToken = context.cookies.get('sb-refresh-token')?.value;

  if (isPortalLogin) {
    if (accessToken) {
      try {
        const supabase = createSupabaseAdmin();
        const { data: { user } } = await supabase.auth.getUser(accessToken);
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role, active')
            .eq('id', user.id)
            .single();
          if (profile?.active) {
            return context.redirect(
              profile.role === 'admin' ? '/portal/admin/' : '/portal/cliente/'
            );
          }
        }
      } catch {
        // Token inválido, mostrar login
      }
    }
    return next();
  }

  // Rutas protegidas
  if (!accessToken) {
    return context.redirect('/portal/login');
  }

  try {
    const supabase = createSupabaseAdmin();

    let currentToken = accessToken;
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      if (refreshToken) {
        const { data: refreshData, error: refreshError } =
          await supabase.auth.refreshSession({ refresh_token: refreshToken });
        if (refreshError || !refreshData.session) {
          context.cookies.delete('sb-access-token', { path: '/' });
          context.cookies.delete('sb-refresh-token', { path: '/' });
          return context.redirect('/portal/login');
        }
        currentToken = refreshData.session.access_token;
        context.cookies.set('sb-access-token', refreshData.session.access_token, {
          path: '/', httpOnly: true, secure: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 7,
        });
        context.cookies.set('sb-refresh-token', refreshData.session.refresh_token!, {
          path: '/', httpOnly: true, secure: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 30,
        });
      } else {
        context.cookies.delete('sb-access-token', { path: '/' });
        return context.redirect('/portal/login');
      }
    }

    const verifiedUser = user || (await supabase.auth.getUser(currentToken)).data.user;
    if (!verifiedUser) {
      return context.redirect('/portal/login');
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', verifiedUser.id)
      .single();

    if (!profile || !profile.active) {
      context.cookies.delete('sb-access-token', { path: '/' });
      context.cookies.delete('sb-refresh-token', { path: '/' });
      return context.redirect('/portal/login');
    }

    if (isPortalAdmin && profile.role !== 'admin') {
      return context.redirect('/portal/login');
    }

    if (isPortalClient && profile.role !== 'client') {
      return context.redirect('/portal/admin/');
    }

    context.locals.user = {
      id: verifiedUser.id,
      email: verifiedUser.email!,
      role: profile.role,
      fullName: profile.full_name || '',
    };
    context.locals.accessToken = currentToken;

    return next();
  } catch {
    context.cookies.delete('sb-access-token', { path: '/' });
    context.cookies.delete('sb-refresh-token', { path: '/' });
    return context.redirect('/portal/login');
  }
});
