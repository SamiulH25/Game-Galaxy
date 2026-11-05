import { error, json } from '@sveltejs/kit';
import { getDb } from '$lib/server/context';
import { readJson, requireGame, requireUser, throttleWrites } from '$lib/server/http';
import { getLeaderboard, isValidScore, submitScore } from '$lib/server/progress';

export function GET({ params, locals, url }) {
	const game = requireGame(params.id);
	if (!game.scoring) error(404, 'This game has no leaderboard');
	const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit')) || 10));
	return json(getLeaderboard(getDb(), game, limit, locals.user?.id ?? null));
}

export async function POST({ params, locals, request }) {
	const user = requireUser(locals);
	const game = requireGame(params.id);
	if (!game.scoring) error(400, 'This game has no leaderboard');
	throttleWrites(user.id);
	const { score } = await readJson(request);
	if (!isValidScore(score)) error(400, 'Score must be a finite number');
	return json(submitScore(getDb(), user.id, game, score));
}
