import { redirect } from '@sveltejs/kit';
import { SESSION_COOKIE, invalidateSession } from '$lib/server/auth';
import { getDb } from '$lib/server/context';
import { clearSessionCookie } from '$lib/server/session-cookie';

export function load() {
	redirect(303, '/');
}

export const actions = {
	default: ({ cookies }) => {
		const token = cookies.get(SESSION_COOKIE);
		if (token) invalidateSession(getDb(), token);
		clearSessionCookie(cookies);
		redirect(303, '/');
	}
};
