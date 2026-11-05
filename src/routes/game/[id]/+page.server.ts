import { error } from '@sveltejs/kit';
import { getCatalog, getDb } from '$lib/server/context';
import { getLeaderboard, listAchievements } from '$lib/server/progress';

export function load({ params, locals }) {
	const game = getCatalog().game(params.id);
	if (!game) error(404, 'That game is not in the galaxy');
	const db = getDb();
	return {
		game,
		leaderboard: game.scoring ? getLeaderboard(db, game, 20, locals.user?.id ?? null) : null,
		unlocked: locals.user ? listAchievements(db, locals.user.id, game.id).map((a) => [a.achievementId, a.unlockedAt] as [string, number]) : null
	};
}
