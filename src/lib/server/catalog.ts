import fs from 'node:fs';
import path from 'node:path';
import type { Catalog, CatalogIssue, GameInfo, SystemInfo } from '$lib/types';
import {
	GAME_ID,
	GameManifestSchema,
	SystemsFileSchema,
	formatZodError,
	resolveAchievements,
	resolvePlanet,
	resolveScoring
} from './manifest';

export const MANIFEST_FILE = 'game.json';
export const SYSTEMS_FILE = 'systems.json';

export interface ScanResult extends Catalog {
	issues: CatalogIssue[];
	scannedAt: number;
}

function readJson(file: string): { ok: true; value: unknown } | { ok: false; error: string } {
	try {
		return { ok: true, value: JSON.parse(fs.readFileSync(file, 'utf8')) };
	} catch (err) {
		return { ok: false, error: err instanceof Error ? err.message : String(err) };
	}
}

function isFile(p: string): boolean {
	try {
		return fs.statSync(p).isFile();
	} catch {
		return false;
	}
}

/**
 * Read `systems.json` and every `<id>/game.json` under `gamesDir`.
 * Bad entries are skipped and reported as issues; the scan itself never throws.
 */
export function scanGames(gamesDir: string): ScanResult {
	const issues: CatalogIssue[] = [];
	const systems: SystemInfo[] = [];
	const systemById = new Map<string, SystemInfo>();

	const systemsPath = path.join(gamesDir, SYSTEMS_FILE);
	if (isFile(systemsPath)) {
		const raw = readJson(systemsPath);
		if (!raw.ok) issues.push({ level: 'error', source: SYSTEMS_FILE, message: `invalid JSON: ${raw.error}` });
		else {
			const parsed = SystemsFileSchema.safeParse(raw.value);
			if (!parsed.success) issues.push({ level: 'error', source: SYSTEMS_FILE, message: formatZodError(parsed.error) });
			else {
				for (const s of parsed.data.systems) {
					if (systemById.has(s.id)) {
						issues.push({ level: 'warn', source: SYSTEMS_FILE, message: `duplicate system id "${s.id}" ignored` });
						continue;
					}
					const sys: SystemInfo = {
						id: s.id,
						name: s.name,
						description: s.description ?? '',
						star: { color: s.star.color.toLowerCase(), size: s.star.size ?? 1 },
						position: s.position ?? null,
						gameIds: []
					};
					systems.push(sys);
					systemById.set(s.id, sys);
				}
			}
		}
	} else {
		issues.push({ level: 'warn', source: SYSTEMS_FILE, message: `not found in ${gamesDir}; no systems defined` });
	}

	const games: GameInfo[] = [];
	let entries: fs.Dirent[] = [];
	try {
		entries = fs.readdirSync(gamesDir, { withFileTypes: true });
	} catch (err) {
		issues.push({ level: 'error', source: gamesDir, message: `cannot read games folder: ${(err as Error).message}` });
	}

	for (const entry of entries) {
		if (!entry.isDirectory() || entry.name.startsWith('.') || entry.name.startsWith('_')) continue;
		const id = entry.name;
		const source = `${id}/${MANIFEST_FILE}`;
		const dir = path.join(gamesDir, id);
		const manifestPath = path.join(dir, MANIFEST_FILE);
		if (!isFile(manifestPath)) continue; // not a game folder (yet)

		if (!GAME_ID.test(id)) {
			issues.push({ level: 'error', source, message: 'folder name must be lowercase letters, digits and dashes' });
			continue;
		}
		const raw = readJson(manifestPath);
		if (!raw.ok) {
			issues.push({ level: 'error', source, message: `invalid JSON: ${raw.error}` });
			continue;
		}
		const parsed = GameManifestSchema.safeParse(raw.value);
		if (!parsed.success) {
			issues.push({ level: 'error', source, message: formatZodError(parsed.error) });
			continue;
		}
		const m = parsed.data;
		if (m.hidden) continue;

		const system = systemById.get(m.system);
		if (!system) {
			issues.push({ level: 'error', source, message: `unknown system "${m.system}" (add it to ${SYSTEMS_FILE})` });
			continue;
		}
		const entryFile = m.entry ?? 'index.html';
		if (!isFile(path.join(dir, entryFile))) {
			issues.push({ level: 'error', source, message: `entry file "${entryFile}" not found` });
			continue;
		}
		let coverUrl: string | null = null;
		if (m.cover) {
			if (isFile(path.join(dir, m.cover))) coverUrl = `/g/${id}/${m.cover}`;
			else issues.push({ level: 'warn', source, message: `cover "${m.cover}" not found` });
		}

		const achievements = resolveAchievements(m.achievements, (message) => issues.push({ level: 'warn', source, message }));
		games.push({
			id,
			title: m.title,
			tagline: m.tagline ?? '',
			description: m.description,
			genres: m.genres ?? [],
			controls: m.controls ?? null,
			url: `/g/${id}/${entryFile}`,
			coverUrl,
			systemId: system.id,
			planet: resolvePlanet(id, m.title, m.planet),
			scoring: resolveScoring(m.scoring),
			achievements,
			order: m.order ?? 0,
			updatedAt: Math.round(fs.statSync(manifestPath).mtimeMs)
		});
	}

	games.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
	for (const g of games) systemById.get(g.systemId)!.gameIds.push(g.id);

	return { systems, games, issues, scannedAt: Date.now() };
}

/** Cheap change detector: names + mtimes of the manifests and systems file. */
export function fingerprint(gamesDir: string): string {
	const parts: string[] = [];
	const stamp = (p: string) => {
		try {
			const s = fs.statSync(p);
			parts.push(`${p}:${s.mtimeMs}:${s.size}`);
		} catch {
			/* missing */
		}
	};
	stamp(path.join(gamesDir, SYSTEMS_FILE));
	try {
		for (const e of fs.readdirSync(gamesDir, { withFileTypes: true })) {
			if (!e.isDirectory()) continue;
			const dir = path.join(gamesDir, e.name);
			stamp(path.join(dir, MANIFEST_FILE));
			stamp(path.join(dir, 'index.html'));
		}
	} catch {
		/* missing dir */
	}
	return parts.join('|');
}

/** Keeps a scanned catalog in memory and refreshes it when files on disk change. */
export class CatalogCache {
	private current: ScanResult | null = null;
	private print = '';
	private checkedAt = 0;

	constructor(
		private readonly gamesDir: string,
		private readonly recheckMs: number,
		private readonly log: (issues: CatalogIssue[]) => void = () => {}
	) {}

	get(): ScanResult {
		const now = Date.now();
		if (this.current && now - this.checkedAt < this.recheckMs) return this.current;
		this.checkedAt = now;
		const print = fingerprint(this.gamesDir);
		if (!this.current || print !== this.print) {
			this.print = print;
			this.current = scanGames(this.gamesDir);
			this.log(this.current.issues);
		}
		return this.current;
	}

	game(id: string): GameInfo | undefined {
		return this.get().games.find((g) => g.id === id);
	}
}
