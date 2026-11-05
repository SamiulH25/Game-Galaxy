import { error, json } from '@sveltejs/kit';
import { getCatalog, getDb } from '$lib/server/context';
import { readJson, requireUser, throttleWrites } from '$lib/server/http';
import { mergeGuestProgress, type GuestGameProgress } from '$lib/server/progress';

export async function POST({ locals, request }) {
	const user = requireUser(locals);
	throttleWrites(user.id);
	const { games } = await readJson(request);
	if (!games || typeof games !== 'object' || Array.isArray(games)) error(400, 'Expected { games: { [id]: progress } }');
	const catalog = getCatalog();
	const summary = mergeGuestProgress(getDb(), user.id, games as Record<string, GuestGameProgress>, (id) => catalog.game(id));
	return json(summary);
}
