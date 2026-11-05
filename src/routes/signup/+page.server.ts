import { fail, redirect } from '@sveltejs/kit';
import { PASSWORD_MAX, PASSWORD_MIN, createSession, createUser } from '$lib/server/auth';
import { getDb, limits } from '$lib/server/context';
import { safeNext } from '$lib/server/redirect';
import { setSessionCookie } from '$lib/server/session-cookie';

export function load({ locals, url }) {
	if (locals.user) redirect(303, safeNext(url));
}

const MESSAGES = {
	'invalid-username': 'Usernames are 3–24 characters: letters, numbers, _ or -.',
	'invalid-password': `Passwords need ${PASSWORD_MIN}–${PASSWORD_MAX} characters.`,
	taken: 'That username is taken. Try another.'
} as const;

export const actions = {
	default: async ({ request, cookies, url, getClientAddress }) => {
		const form = await request.formData();
		const username = String(form.get('username') ?? '').trim();
		const password = String(form.get('password') ?? '');
		if (!limits.auth.take(getClientAddress())) return fail(429, { username, field: null, message: 'Too many attempts. Wait a few minutes and try again.' });

		const result = await createUser(getDb(), username, password);
		if (!result.ok) return fail(400, { username, field: result.error === 'invalid-password' ? ('password' as const) : ('username' as const), message: MESSAGES[result.error] });

		const { token, expiresAt } = createSession(getDb(), result.user.id);
		setSessionCookie(cookies, url, token, expiresAt);
		redirect(303, safeNext(url));
	}
};
