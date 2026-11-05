import { and, asc, count, desc, eq, gt, lt, sql } from 'drizzle-orm';
import type { DB } from './db';
import { achievements, plays, saves, scores, users } from './db/schema';
import type { GameInfo, GuestGameProgress, LeaderboardData, LeaderboardEntry, MergeSummary, ScoreResult } from '$lib/types';

export type { GuestGameProgress, MergeSummary };

export const MAX_SAVE_BYTES = 256 * 1024;
export const MAX_ABS_SCORE = 1e12;

// ── Saves ─────────────────────────────────────────────────────────────

export function getSave(db: DB, userId: string, gameId: string): { data: unknown; updatedAt: number } | null {
	const row = db.select().from(saves).where(and(eq(saves.userId, userId), eq(saves.gameId, gameId))).get();
	return row ? { data: JSON.parse(row.data), updatedAt: row.updatedAt.getTime() } : null;
}

/** Store a save. `data` must already be validated as JSON-serialisable and within MAX_SAVE_BYTES. */
export function putSave(db: DB, userId: string, gameId: string, json: string): number {
	const updatedAt = new Date();
	db.insert(saves)
		.values({ userId, gameId, data: json, updatedAt })
		.onConflictDoUpdate({ target: [saves.userId, saves.gameId], set: { data: json, updatedAt } })
		.run();
	return updatedAt.getTime();
}

export function deleteSave(db: DB, userId: string, gameId: string): void {
	db.delete(saves).where(and(eq(saves.userId, userId), eq(saves.gameId, gameId))).run();
}

/** Serialise and size-check a save payload. Returns null when it is not acceptable. */
export function encodeSave(data: unknown): string | null {
	if (data === undefined) return null;
	let json: string;
	try {
		json = JSON.stringify(data);
	} catch {
		return null;
	}
	if (json === undefined || Buffer.byteLength(json) > MAX_SAVE_BYTES) return null;
	return json;
}

// ── Scores ────────────────────────────────────────────────────────────

export function isValidScore(score: unknown): score is number {
	return typeof score === 'number' && Number.isFinite(score) && Math.abs(score) <= MAX_ABS_SCORE;
}

const better = (order: 'asc' | 'desc', a: number, b: number) => (order === 'desc' ? a > b : a < b);

/** Players whose best beats `score` + 1. Ties share a rank. */
export function rankOf(db: Pick<DB, 'select'>, gameId: string, order: 'asc' | 'desc', score: number): number {
	const cmp = order === 'desc' ? gt(scores.score, score) : lt(scores.score, score);
	const row = db.select({ n: count() }).from(scores).where(and(eq(scores.gameId, gameId), cmp)).get();
	return (row?.n ?? 0) + 1;
}

/** Record a score; only a player's best is kept. */
export function submitScore(db: DB, userId: string, game: Pick<GameInfo, 'id' | 'scoring'>, score: number): ScoreResult {
	const order = game.scoring?.order ?? 'desc';
	return db.transaction((tx) => {
		const existing = tx
			.select({ score: scores.score })
			.from(scores)
			.where(and(eq(scores.userId, userId), eq(scores.gameId, game.id)))
			.get();
		let best = score;
		let personalBest = true;
		if (!existing) {
			tx.insert(scores).values({ userId, gameId: game.id, score, achievedAt: new Date() }).run();
		} else if (better(order, score, existing.score)) {
			tx.update(scores)
				.set({ score, achievedAt: new Date() })
				.where(and(eq(scores.userId, userId), eq(scores.gameId, game.id)))
				.run();
		} else {
			best = existing.score;
			personalBest = false;
		}
		return { best, personalBest, rank: rankOf(tx, game.id, order, best) };
	});
}

export function getLeaderboard(
	db: DB,
	game: Pick<GameInfo, 'id' | 'scoring'>,
	limit: number,
	viewerId: string | null
): LeaderboardData {
	const order = game.scoring?.order ?? 'desc';
	const rows = db
		.select({ userId: scores.userId, username: users.username, score: scores.score, achievedAt: scores.achievedAt })
		.from(scores)
		.innerJoin(users, eq(users.id, scores.userId))
		.where(eq(scores.gameId, game.id))
		.orderBy(order === 'desc' ? desc(scores.score) : asc(scores.score), asc(scores.achievedAt))
		.limit(limit)
		.all();

	// Competition ranking ("1, 2, 2, 4"): rank = 1 + number of strictly better scores.
	const entries: LeaderboardEntry[] = [];
	rows.forEach((r, i) => {
		const prev = entries[i - 1];
		const rank = prev && prev.score === r.score ? prev.rank : i + 1;
		entries.push({ rank, username: r.username, score: r.score, achievedAt: r.achievedAt.getTime(), isYou: r.userId === viewerId });
	});

	let you = entries.find((e) => e.isYou) ?? null;
	if (!you && viewerId) {
		const mine = db
			.select({ score: scores.score, achievedAt: scores.achievedAt, username: users.username })
			.from(scores)
			.innerJoin(users, eq(users.id, scores.userId))
			.where(and(eq(scores.userId, viewerId), eq(scores.gameId, game.id)))
			.get();
		if (mine)
			you = { rank: rankOf(db, game.id, order, mine.score), username: mine.username, score: mine.score, achievedAt: mine.achievedAt.getTime(), isYou: true };
	}
	const total = db.select({ n: count() }).from(scores).where(eq(scores.gameId, game.id)).get()?.n ?? 0;
	return { entries, you, total };
}

// ── Achievements ──────────────────────────────────────────────────────

export function unlockAchievement(db: DB, userId: string, gameId: string, achievementId: string): { new: boolean; unlockedAt: number } {
	const unlockedAt = new Date();
	const res = db.insert(achievements).values({ userId, gameId, achievementId, unlockedAt }).onConflictDoNothing().run();
	if (res.changes > 0) return { new: true, unlockedAt: unlockedAt.getTime() };
	const row = db
		.select({ unlockedAt: achievements.unlockedAt })
		.from(achievements)
		.where(and(eq(achievements.userId, userId), eq(achievements.gameId, gameId), eq(achievements.achievementId, achievementId)))
		.get();
	return { new: false, unlockedAt: row?.unlockedAt.getTime() ?? unlockedAt.getTime() };
}

export function listAchievements(db: DB, userId: string, gameId?: string): { gameId: string; achievementId: string; unlockedAt: number }[] {
	return db
		.select()
		.from(achievements)
		.where(gameId ? and(eq(achievements.userId, userId), eq(achievements.gameId, gameId)) : eq(achievements.userId, userId))
		.orderBy(desc(achievements.unlockedAt))
		.all()
		.map((r) => ({ gameId: r.gameId, achievementId: r.achievementId, unlockedAt: r.unlockedAt.getTime() }));
}

// ── Plays ─────────────────────────────────────────────────────────────

export function recordPlay(db: DB, userId: string, gameId: string): void {
	const now = new Date();
	db.insert(plays)
		.values({ userId, gameId, count: 1, firstPlayedAt: now, lastPlayedAt: now })
		.onConflictDoUpdate({ target: [plays.userId, plays.gameId], set: { count: sql`${plays.count} + 1`, lastPlayedAt: now } })
		.run();
}

export function listPlays(db: DB, userId: string): { gameId: string; count: number; lastPlayedAt: number }[] {
	return db
		.select()
		.from(plays)
		.where(eq(plays.userId, userId))
		.orderBy(desc(plays.lastPlayedAt))
		.all()
		.map((r) => ({ gameId: r.gameId, count: r.count, lastPlayedAt: r.lastPlayedAt.getTime() }));
}

export function listBestScores(db: DB, userId: string): { gameId: string; score: number; achievedAt: number }[] {
	return db
		.select()
		.from(scores)
		.where(eq(scores.userId, userId))
		.all()
		.map((r) => ({ gameId: r.gameId, score: r.score, achievedAt: r.achievedAt.getTime() }));
}

// ── Guest progress import ─────────────────────────────────────────────

/**
 * Import progress a player made as a guest. Cloud saves are never overwritten;
 * scores go through the normal best-only rule; unknown games/achievements are ignored.
 */
export function mergeGuestProgress(
	db: DB,
	userId: string,
	progress: Record<string, GuestGameProgress>,
	findGame: (id: string) => GameInfo | undefined
): MergeSummary {
	const summary: MergeSummary = { games: 0, savesImported: 0, savesKept: 0, scores: 0, achievements: 0 };
	for (const [gameId, p] of Object.entries(progress)) {
		const game = findGame(gameId);
		if (!game || !p || typeof p !== 'object') continue;
		summary.games++;
		if (p.save !== undefined && p.save !== null) {
			const json = encodeSave(p.save);
			if (json) {
				if (getSave(db, userId, gameId)) summary.savesKept++;
				else {
					putSave(db, userId, gameId, json);
					summary.savesImported++;
				}
			}
		}
		if (game.scoring && isValidScore(p.best)) {
			if (submitScore(db, userId, game, p.best).personalBest) summary.scores++;
		}
		if (Array.isArray(p.achievements)) {
			const valid = new Set(game.achievements.map((a) => a.id));
			for (const id of new Set(p.achievements)) {
				if (typeof id === 'string' && valid.has(id) && unlockAchievement(db, userId, gameId, id).new) summary.achievements++;
			}
		}
		if (typeof p.plays === 'number' && p.plays > 0) recordPlay(db, userId, gameId);
	}
	return summary;
}
