import { describe, expect, it } from 'vitest';
import { createUser } from '$lib/server/auth';
import {
	encodeSave,
	getLeaderboard,
	getSave,
	isValidScore,
	listAchievements,
	listPlays,
	mergeGuestProgress,
	putSave,
	recordPlay,
	submitScore,
	unlockAchievement
} from '$lib/server/progress';
import type { GameInfo } from '$lib/types';
import { memoryDb } from './helpers';

const game = (scoring: GameInfo['scoring'] = { label: 'Score', order: 'desc', format: 'number' }) =>
	({
		id: 'g1',
		scoring,
		achievements: [{ id: 'a1', title: 'A', description: 'a', icon: 'star', secret: false }]
	}) as GameInfo;

async function users(db: ReturnType<typeof memoryDb>, names: string[]) {
	const ids: string[] = [];
	for (const n of names) {
		const r = await createUser(db, n, 'password123');
		if (!r.ok) throw new Error(n);
		ids.push(r.user.id);
	}
	return ids;
}

describe('scores', () => {
	it('keeps only the best score and ranks with ties', async () => {
		const db = memoryDb();
		const [a, b, c] = await users(db, ['ann', 'bob', 'cat']);
		const g = game();
		expect(submitScore(db, a, g, 100)).toEqual({ best: 100, personalBest: true, rank: 1 });
		expect(submitScore(db, a, g, 50)).toEqual({ best: 100, personalBest: false, rank: 1 });
		expect(submitScore(db, b, g, 100).rank).toBe(1); // tie shares rank
		expect(submitScore(db, c, g, 80).rank).toBe(3);
		const lb = getLeaderboard(db, g, 10, c);
		expect(lb.entries.map((e) => [e.username, e.rank])).toEqual([
			['ann', 1],
			['bob', 1],
			['cat', 3]
		]);
		expect(lb.total).toBe(3);
		expect(getLeaderboard(db, g, 1, c).you).toMatchObject({ username: 'cat', rank: 3, isYou: true });
	});

	it('supports lower-is-better boards', async () => {
		const db = memoryDb();
		const [a, b] = await users(db, ['fast', 'slow']);
		const g = game({ label: 'Time', order: 'asc', format: 'time' });
		submitScore(db, a, g, 30.5);
		submitScore(db, b, g, 42);
		expect(submitScore(db, b, g, 50).personalBest).toBe(false);
		expect(submitScore(db, b, g, 12)).toEqual({ best: 12, personalBest: true, rank: 1 });
		expect(getLeaderboard(db, g, 10, null).entries[0].username).toBe('slow');
	});

	it('validates scores', () => {
		expect(isValidScore(1)).toBe(true);
		expect(isValidScore(-3.5)).toBe(true);
		for (const bad of [NaN, Infinity, '5', null, 1e13]) expect(isValidScore(bad)).toBe(false);
	});
});

describe('saves, achievements, plays', () => {
	it('upserts saves and enforces size', async () => {
		const db = memoryDb();
		const [a] = await users(db, ['saver']);
		putSave(db, a, 'g1', encodeSave({ level: 1 })!);
		putSave(db, a, 'g1', encodeSave({ level: 2 })!);
		expect(getSave(db, a, 'g1')?.data).toEqual({ level: 2 });
		expect(encodeSave(undefined)).toBeNull();
		expect(encodeSave('x'.repeat(300 * 1024))).toBeNull();
	});

	it('unlocks achievements once', async () => {
		const db = memoryDb();
		const [a] = await users(db, ['ach']);
		expect(unlockAchievement(db, a, 'g1', 'a1').new).toBe(true);
		expect(unlockAchievement(db, a, 'g1', 'a1').new).toBe(false);
		expect(listAchievements(db, a, 'g1')).toHaveLength(1);
	});

	it('counts plays', async () => {
		const db = memoryDb();
		const [a] = await users(db, ['player']);
		recordPlay(db, a, 'g1');
		recordPlay(db, a, 'g1');
		expect(listPlays(db, a)[0]).toMatchObject({ gameId: 'g1', count: 2 });
	});
});

describe('guest import', () => {
	it('imports progress without clobbering cloud saves', async () => {
		const db = memoryDb();
		const [a] = await users(db, ['guest']);
		const g = game();
		putSave(db, a, 'g1', encodeSave({ cloud: true })!);
		const summary = mergeGuestProgress(
			db,
			a,
			{
				g1: { save: { cloud: false }, best: 77, achievements: ['a1', 'bogus'], plays: 3 },
				unknown: { save: { x: 1 } }
			},
			(id) => (id === 'g1' ? g : undefined)
		);
		expect(summary).toEqual({ games: 1, savesImported: 0, savesKept: 1, scores: 1, achievements: 1 });
		expect(getSave(db, a, 'g1')?.data).toEqual({ cloud: true });
		expect(getLeaderboard(db, g, 5, a).you?.score).toBe(77);
	});
});
