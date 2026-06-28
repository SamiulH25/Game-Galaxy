import type { Handle } from '@sveltejs/kit';

/** Match unified backend: same-origin pages may be embedded (game iframes). */
export const handle: Handle = async ({ event, resolve }) => {
  const response = await resolve(event);
  if (!event.url.pathname.startsWith('/api')) {
    response.headers.set('X-Frame-Options', 'SAMEORIGIN');
    response.headers.set('Content-Security-Policy', "frame-ancestors 'self'");
  }
  return response;
};
