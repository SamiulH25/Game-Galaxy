import path from 'node:path';
import { error, redirect } from '@sveltejs/kit';
import { gamesDir, getCatalog } from '$lib/server/context';
import { GAME_ID } from '$lib/server/manifest';
import { fileResponse, resolveInside } from '$lib/server/files';

/** Serves the files of a game folder straight from disk, so new games need no rebuild. */
export function GET({ params, request }) {
	if (!GAME_ID.test(params.id)) error(404, 'Not found');
	if (!params.path) {
		const game = getCatalog().game(params.id);
		redirect(307, game?.url ?? `/g/${params.id}/index.html`);
	}
	const file = resolveInside(path.join(gamesDir(), params.id), params.path);
	if (!file) error(404, 'Not found');
	return fileResponse(file, request);
}
