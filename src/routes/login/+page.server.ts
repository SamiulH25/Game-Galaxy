import { fail, redirect } from '@sveltejs/kit';
import { authenticate, createSession } from '$lib/server/auth';
import { getDb, limits } from '$lib/server/context';
import { safeNext } from '$lib/server/redirect';
import { setSessionCookie } from '$lib/server/session-cookie';

export function load({ locals, url }) {
	if (locals.user) redirect(303, safeNext(url));
}

export const actions = {
	default: async ({ request, cookies, url, getClientAddress }) => {
		const form = await request.formData();
		const username = String(form.get('username') ?? '').trim();
		const password = String(form.get('password') ?? '');
		if (!limits.auth.take(getClientAddress())) return fail(429, { username, message: 'Too many attempts. Wait a few minutes and try again.' });
		if (!username || !password) return fail(400, { username, message: 'Enter your username and password.' });

		const user = await authenticate(getDb(), username, password);
		if (!user) return fail(400, { username, message: 'That username and password don’t match.' });

		const { token, expiresAt } = createSession(getDb(), user.id);
		setSessionCookie(cookies, url, token, expiresAt);
		redirect(303, safeNext(url));
	}
};
