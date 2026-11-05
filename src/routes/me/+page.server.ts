import { redirect } from '@sveltejs/kit';
import { getMemberSince } from '$lib/server/auth';
import { getCatalog, getDb } from '$lib/server/context';
import { listAchievements, listBestScores, listPlays, rankOf } from '$lib/server/progress';

export function load({ locals }) {
	if (!locals.user) redirect(303, '/login?next=/me');
	const db = getDb();
	const catalog = getCatalog();
	const userId = locals.user.id;

	const bests = listBestScores(db, userId).flatMap((b) => {
		const game = catalog.game(b.gameId);
		if (!game?.scoring) return [];
		return [{ ...b, rank: rankOf(db, game.id, game.scoring.order, b.score) }];
	});

	return {
		memberSince: getMemberSince(db, userId),
		plays: listPlays(db, userId).filter((p) => catalog.game(p.gameId)),
		bests,
		achievements: listAchievements(db, userId).filter((a) => catalog.game(a.gameId)?.achievements.some((x) => x.id === a.achievementId))
	};
}
