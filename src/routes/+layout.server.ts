import { getCatalog } from '$lib/server/context';

export function load({ locals }) {
	const { systems, games } = getCatalog().get();
	return { user: locals.user, catalog: { systems, games } };
}
