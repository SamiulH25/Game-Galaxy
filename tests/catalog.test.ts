import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { CatalogCache, scanGames } from '$lib/server/catalog';
import { resolvePlanet } from '$lib/server/manifest';
import { SYSTEMS, manifest, tempGames } from './helpers';

describe('scanGames', () => {
	it('loads valid games and resolves defaults', () => {
		const dir = tempGames({
			'systems.json': SYSTEMS,
			'alpha/game.json': manifest({ title: 'Alpha', scoring: { order: 'asc' }, achievements: [{ id: 'win', title: 'Win', description: 'Win once' }] }),
			'alpha/index.html': '<!doctype html>',
			'alpha/cover.svg': '<svg/>'
		});
		fs.writeFileSync(path.join(dir, 'alpha/game.json'), JSON.stringify(manifest({ title: 'Alpha', cover: 'cover.svg', scoring: { order: 'asc' }, achievements: [{ id: 'win', title: 'Win', description: 'Win once' }] })));
		const res = scanGames(dir);
		expect(res.issues.filter((i) => i.level === 'error')).toEqual([]);
		expect(res.games).toHaveLength(1);
		const g = res.games[0];
		expect(g).toMatchObject({ id: 'alpha', title: 'Alpha', url: '/g/alpha/index.html', coverUrl: '/g/alpha/cover.svg', systemId: 'sol' });
		expect(g.scoring).toEqual({ label: 'Score', order: 'asc', format: 'number' });
		expect(g.achievements[0]).toMatchObject({ id: 'win', icon: 'star', secret: false });
		expect(res.systems[0].gameIds).toEqual(['alpha']);
	});

	it('reports and skips broken games without failing the scan', () => {
		const dir = tempGames({
			'systems.json': SYSTEMS,
			'good/game.json': manifest(),
			'good/index.html': 'x',
			'bad-json/game.json': '{ nope',
			'bad-json/index.html': 'x',
			'no-entry/game.json': manifest(),
			'unknown-system/game.json': manifest({ system: 'vega' }),
			'unknown-system/index.html': 'x',
			'Bad_Name/game.json': manifest(),
			'Bad_Name/index.html': 'x',
			'_archive/old/game.json': manifest(),
			'draft/game.json': manifest({ hidden: true }),
			'draft/index.html': 'x'
		});
		const res = scanGames(dir);
		expect(res.games.map((g) => g.id)).toEqual(['good']);
		const sources = res.issues.filter((i) => i.level === 'error').map((i) => i.source.split('/')[0]);
		expect(sources.sort()).toEqual(['Bad_Name', 'bad-json', 'no-entry', 'unknown-system']);
	});

	it('rejects unsafe entry paths and unknown keys', () => {
		const dir = tempGames({
			'systems.json': SYSTEMS,
			'evil/game.json': manifest({ entry: '../../etc/passwd' }),
			'typo/game.json': manifest({ titel: 'oops' })
		});
		const res = scanGames(dir);
		expect(res.games).toEqual([]);
		expect(res.issues.some((i) => i.source.startsWith('evil') && /relative path/.test(i.message))).toBe(true);
		expect(res.issues.some((i) => i.source.startsWith('typo'))).toBe(true);
	});

	it('warns about unknown achievement icons and duplicates but keeps the game', () => {
		const dir = tempGames({
			'systems.json': SYSTEMS,
			'g/game.json': manifest({
				achievements: [
					{ id: 'a', title: 'A', description: 'a', icon: 'unicorn' },
					{ id: 'a', title: 'A2', description: 'dup' }
				]
			}),
			'g/index.html': 'x'
		});
		const res = scanGames(dir);
		expect(res.games[0].achievements).toHaveLength(1);
		expect(res.issues.filter((i) => i.level === 'warn')).toHaveLength(2);
	});

	it('picks up new games on rescan', () => {
		const dir = tempGames({ 'systems.json': SYSTEMS });
		const cache = new CatalogCache(dir, 0);
		expect(cache.get().games).toHaveLength(0);
		fs.mkdirSync(path.join(dir, 'later'));
		fs.writeFileSync(path.join(dir, 'later/index.html'), 'x');
		fs.writeFileSync(path.join(dir, 'later/game.json'), JSON.stringify(manifest()));
		expect(cache.get().games.map((g) => g.id)).toEqual(['later']);
	});
});

describe('resolvePlanet', () => {
	it('is deterministic and honours explicit values', () => {
		expect(resolvePlanet('abc', 'T')).toEqual(resolvePlanet('abc', 'T'));
		const p = resolvePlanet('abc', 'Title', { kind: 'gas', color: '#112233', rings: true, moons: 3, atmosphere: false, size: 2 });
		expect(p).toMatchObject({ name: 'Title', kind: 'gas', color: '#112233', moons: 3, atmosphere: null, size: 2 });
		expect(p.rings).not.toBeNull();
	});
});
