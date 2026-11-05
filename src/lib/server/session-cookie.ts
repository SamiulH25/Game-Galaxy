import type { Cookies } from '@sveltejs/kit';
import { SESSION_COOKIE } from './auth';

export function setSessionCookie(cookies: Cookies, url: URL, token: string, expires: Date): void {
	cookies.set(SESSION_COOKIE, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		// Only mark Secure on HTTPS so plain-HTTP LAN deployments can still sign in.
		secure: url.protocol === 'https:',
		expires
	});
}

export function clearSessionCookie(cookies: Cookies): void {
	cookies.delete(SESSION_COOKIE, { path: '/' });
}
