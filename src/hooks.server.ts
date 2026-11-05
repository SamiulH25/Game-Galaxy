import { json, type Handle } from '@sveltejs/kit';
import { SESSION_COOKIE, validateSession } from '$lib/server/auth';
import { getDb } from '$lib/server/context';
import { clearSessionCookie, setSessionCookie } from '$lib/server/session-cookie';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export const handle: Handle = async ({ event, resolve }) => {
	const { url, request, cookies } = event;
	const isGameFile = url.pathname.startsWith('/g/');

	event.locals.user = null;
	const token = isGameFile ? undefined : cookies.get(SESSION_COOKIE);
	if (token) {
		const session = validateSession(getDb(), token);
		if (session) {
			event.locals.user = session.user;
			if (session.renewedUntil) setSessionCookie(cookies, url, token, session.renewedUntil);
		} else {
			clearSessionCookie(cookies);
		}
	}

	// SvelteKit's CSRF check covers form posts; this covers JSON API writes.
	if (url.pathname.startsWith('/api/') && !SAFE_METHODS.has(request.method)) {
		const origin = request.headers.get('origin');
		if (origin && origin !== url.origin) return json({ message: 'Cross-site request blocked' }, { status: 403 });
	}

	const response = await resolve(event);
	try {
		response.headers.set('x-content-type-options', 'nosniff');
		response.headers.set('referrer-policy', 'strict-origin-when-cross-origin');
		if (!isGameFile) response.headers.set('x-frame-options', 'SAMEORIGIN');
	} catch {
		/* immutable headers */
	}
	return response;
};
