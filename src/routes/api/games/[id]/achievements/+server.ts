import { error, json } from '@sveltejs/kit';
import { getDb } from '$lib/server/context';
import { readJson, requireGame, requireUser, throttleWrites } from '$lib/server/http';
import { listAchievements, unlockAchievement } from '$lib/server/progress';

export function GET({ params, locals }) {
	const user = requireUser(locals);
	const game = requireGame(params.id);
	return json({ unlocked: listAchievements(getDb(), user.id, game.id).map(({ achievementId, unlockedAt }) => ({ id: achievementId, unlockedAt })) });
}

export async function POST({ params, locals, request }) {
	const user = requireUser(locals);
	const game = requireGame(params.id);
	throttleWrites(user.id);
	const { id } = await readJson(request);
	if (typeof id !== 'string' || !game.achievements.some((a) => a.id === id)) error(400, `Unknown achievement for ${game.id}`);
	return json(unlockAchievement(getDb(), user.id, game.id, id));
}
