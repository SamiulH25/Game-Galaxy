import { error, json } from '@sveltejs/kit';
import { getDb } from '$lib/server/context';
import { readJson, requireGame, requireUser, throttleWrites } from '$lib/server/http';
import { deleteSave, encodeSave, getSave, putSave } from '$lib/server/progress';

export function GET({ params, locals }) {
	const user = requireUser(locals);
	const game = requireGame(params.id);
	return json(getSave(getDb(), user.id, game.id) ?? { data: null, updatedAt: null });
}

export async function PUT({ params, locals, request }) {
	const user = requireUser(locals);
	const game = requireGame(params.id);
	throttleWrites(user.id);
	const body = await readJson(request);
	const encoded = encodeSave(body.data);
	if (encoded === null) error(400, 'Save data must be JSON and under 256 KB');
	return json({ updatedAt: putSave(getDb(), user.id, game.id, encoded) });
}

export function DELETE({ params, locals }) {
	const user = requireUser(locals);
	const game = requireGame(params.id);
	throttleWrites(user.id);
	deleteSave(getDb(), user.id, game.id);
	return json({ ok: true });
}
