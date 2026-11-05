import { json } from '@sveltejs/kit';
import { getDb } from '$lib/server/context';
import { requireGame, requireUser, throttleWrites } from '$lib/server/http';
import { recordPlay } from '$lib/server/progress';

export function POST({ params, locals }) {
	const user = requireUser(locals);
	const game = requireGame(params.id);
	throttleWrites(user.id);
	recordPlay(getDb(), user.id, game.id);
	return json({ ok: true });
}
