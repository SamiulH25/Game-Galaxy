import { describe, expect, it } from 'vitest';
import { layoutGalaxy } from '$lib/galaxy/layout';
import { resolvePlanet } from '$lib/server/manifest';
import type { Catalog, GameInfo } from '$lib/types';

function catalog(systemCount: number, gamesPer: number): Catalog {
	const games: GameInfo[] = [];
	const systems = Array.from({ length: systemCount }, (_, s) => {
		const ids = Array.from({ length: gamesPer }, (_, i) => `s${s}-g${i}`);
		for (const id of ids)
			games.push({ id, title: id, planet: resolvePlanet(id, id, { rings: true, moons: 2, size: 2.5 }) } as GameInfo);
		return { id: `s${s}`, name: `S${s}`, description: '', star: { color: '#ffffff', size: 2 }, position: null, gameIds: ids };
	});
	return { systems, games };
}

describe('layoutGalaxy', () => {
	it('keeps systems from overlapping even when crowded', () => {
		const { systems } = layoutGalaxy(catalog(8, 9));
		for (let i = 0; i < systems.length; i++)
			for (let j = i + 1; j < systems.length; j++) {
				const a = systems[i];
				const b = systems[j];
				const d = Math.hypot(a.position[0] - b.position[0], a.position[2] - b.position[2]);
				expect(d).toBeGreaterThan(a.extent + b.extent);
			}
	});

	it('spaces orbits so planets never collide', () => {
		const [sys] = layoutGalaxy(catalog(1, 9)).systems;
		for (let i = 1; i < sys.planets.length; i++) {
			const gap = sys.planets[i].orbitRadius - sys.planets[i - 1].orbitRadius;
			expect(gap).toBeGreaterThan(sys.planets[i].radius * 2.4 + sys.planets[i - 1].radius * 2.4);
		}
		expect(sys.planets[0].orbitRadius).toBeGreaterThan(sys.starRadius * 2);
	});
});
