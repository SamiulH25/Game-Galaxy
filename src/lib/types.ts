/**
 * Types shared by the server and the browser.
 * Everything here is plain JSON so it can cross the load() boundary.
 */

export const PLANET_KINDS = ['terran', 'rocky', 'gas', 'ice', 'lava', 'ocean'] as const;
export type PlanetKind = (typeof PLANET_KINDS)[number];

export const ACHIEVEMENT_ICONS = [
	'star',
	'trophy',
	'bolt',
	'diamond',
	'moon',
	'flame',
	'shield',
	'crown',
	'heart',
	'target',
	'rocket',
	'compass'
] as const;
export type AchievementIcon = (typeof ACHIEVEMENT_ICONS)[number];

export interface PlanetVisual {
	name: string;
	kind: PlanetKind;
	/** Base surface colour, `#rrggbb`. */
	color: string;
	/** Secondary colour used for bands, oceans, lava cracks. */
	accent: string;
	/** Relative radius, 0.4–2.5 (1 = typical). */
	size: number;
	rings: { color: string; tilt: number } | null;
	moons: number;
	/** Atmosphere glow colour or null for airless worlds. */
	atmosphere: string | null;
	/** Deterministic 0–1 seed for noise offsets and orbit phase. */
	seed: number;
}

export interface Achievement {
	id: string;
	title: string;
	description: string;
	icon: AchievementIcon;
	secret: boolean;
}

export interface Scoring {
	label: string;
	/** `desc`: higher is better. `asc`: lower is better (e.g. fastest time). */
	order: 'desc' | 'asc';
	format: 'number' | 'time';
}

export interface GameInfo {
	id: string;
	title: string;
	tagline: string;
	description: string;
	genres: string[];
	controls: string | null;
	/** URL of the playable entry document. */
	url: string;
	coverUrl: string | null;
	systemId: string;
	planet: PlanetVisual;
	scoring: Scoring | null;
	achievements: Achievement[];
	order: number;
	updatedAt: number;
}

export interface SystemInfo {
	id: string;
	name: string;
	description: string;
	star: { color: string; size: number };
	/** Optional fixed placement in the galaxy disc, otherwise laid out automatically. */
	position: [number, number] | null;
	gameIds: string[];
}

export interface CatalogIssue {
	level: 'error' | 'warn';
	source: string;
	message: string;
}

export interface Catalog {
	systems: SystemInfo[];
	games: GameInfo[];
}

export interface PublicUser {
	id: string;
	username: string;
}

export interface LeaderboardEntry {
	rank: number;
	username: string;
	score: number;
	achievedAt: number;
	isYou: boolean;
}

export interface ScoreResult {
	best: number;
	personalBest: boolean;
	rank: number | null;
}

export interface GuestGameProgress {
	save?: unknown;
	best?: number;
	achievements?: string[];
	plays?: number;
}

export interface MergeSummary {
	games: number;
	savesImported: number;
	savesKept: number;
	scores: number;
	achievements: number;
}

export interface LeaderboardData {
	entries: LeaderboardEntry[];
	you: LeaderboardEntry | null;
	total: number;
}
