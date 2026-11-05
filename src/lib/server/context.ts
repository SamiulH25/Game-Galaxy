import path from 'node:path';
import { env } from '$env/dynamic/private';
import { dev } from '$app/environment';
import { openDatabase, type DB } from './db';
import { CatalogCache } from './catalog';
import { RateLimiter } from './rate-limit';

/** Process-wide singletons, created lazily on first use. */

let db: DB | null = null;
export function getDb(): DB {
	return (db ??= openDatabase(path.resolve(env.DATABASE_PATH || 'data/galaxy.db')));
}

export const gamesDir = () => path.resolve(env.GAMES_DIR || 'games');

let catalog: CatalogCache | null = null;
export function getCatalog(): CatalogCache {
	return (catalog ??= new CatalogCache(gamesDir(), (Number(env.GAMES_RESCAN_SECONDS) || (dev ? 2 : 10)) * 1000, (issues) => {
		for (const i of issues) console[i.level === 'error' ? 'error' : 'warn'](`[catalog] ${i.source}: ${i.message}`);
	}));
}

export const limits = {
	/** Login/signup attempts per client address. */
	auth: new RateLimiter(20, 10 * 60 * 1000),
	/** Game API writes per player (or per guest address). */
	writes: new RateLimiter(240, 60 * 1000)
};
