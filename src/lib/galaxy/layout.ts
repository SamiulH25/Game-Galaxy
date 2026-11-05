import type { Catalog, GameInfo, SystemInfo } from '$lib/types';
import { hashString, mulberry32 } from '$lib/random';

/** Pure placement maths for the galaxy: where systems sit and how planets orbit. */

export interface PlanetLayout {
	game: GameInfo;
	/** Visual radius of the planet sphere. */
	radius: number;
	orbitRadius: number;
	/** Angular speed, radians per second. */
	speed: number;
	phase: number;
	inclination: number;
	axialTilt: number;
	spin: number;
}

export interface SystemLayout {
	system: SystemInfo;
	position: [number, number, number];
	starRadius: number;
	planets: PlanetLayout[];
	/** Radius that encloses every orbit (plus margin). */
	extent: number;
}

export interface GalaxyLayout {
	systems: SystemLayout[];
	radius: number;
}

export const PLANET_SCALE = 0.55;

function planetFootprint(g: GameInfo): number {
	const r = g.planet.size * PLANET_SCALE;
	return r * (g.planet.rings ? 2.4 : 1) + (g.planet.moons ? 0.9 : 0);
}

export function layoutSystem(system: SystemInfo, games: GameInfo[]): Omit<SystemLayout, 'position'> {
	const starRadius = 1.4 * system.star.size;
	const planets: PlanetLayout[] = [];
	let cursor = starRadius * 2.4 + 1.6;
	let prevFootprint = 0;
	for (const game of games) {
		const footprint = planetFootprint(game);
		const orbitRadius = cursor + prevFootprint + footprint;
		const rand = mulberry32(hashString(game.id + ':orbit'));
		planets.push({
			game,
			radius: game.planet.size * PLANET_SCALE,
			orbitRadius,
			speed: 0.32 / Math.pow(orbitRadius, 0.8),
			phase: game.planet.seed * Math.PI * 2,
			inclination: (rand() - 0.5) * 0.08,
			axialTilt: (rand() - 0.5) * 0.7,
			spin: 0.08 + rand() * 0.12
		});
		cursor = orbitRadius + 1.4;
		prevFootprint = footprint;
	}
	const outer = planets.length ? planets[planets.length - 1].orbitRadius + prevFootprint : starRadius * 4;
	return { system, starRadius, planets, extent: outer + 3 };
}

export function layoutGalaxy(catalog: Catalog): GalaxyLayout {
	const byId = new Map(catalog.games.map((g) => [g.id, g]));
	const placed: SystemLayout[] = [];

	catalog.systems.forEach((system, i) => {
		const base = layoutSystem(
			system,
			system.gameIds.map((id) => byId.get(id)!).filter(Boolean)
		);
		const rand = mulberry32(hashString(system.id + ':place'));
		let position: [number, number, number];
		if (system.position) {
			position = [system.position[0], 0, system.position[1]];
		} else {
			// Two-armed spiral: alternate arms, step outward along each.
			const arm = i % 2;
			const step = Math.floor(i / 2);
			let r = 26 + step * 30 + arm * 10;
			const angleAt = (radius: number) => arm * Math.PI + radius * 0.035 + 0.5;
			const at = (radius: number): [number, number, number] => [
				Math.cos(angleAt(radius)) * radius,
				(rand() - 0.5) * 6,
				Math.sin(angleAt(radius)) * radius
			];
			position = at(r);
			// Push outward until clear of systems already placed.
			for (let guard = 0; guard < 60; guard++) {
				const clash = placed.some((o) => Math.hypot(o.position[0] - position[0], o.position[2] - position[2]) < o.extent + base.extent + 8);
				if (!clash) break;
				r += 6;
				position = at(r);
			}
		}
		placed.push({ ...base, position });
	});

	const far = placed.reduce((m, s) => Math.max(m, Math.hypot(s.position[0], s.position[2]) + s.extent), 0);
	return { systems: placed, radius: Math.max(110, far + 30) };
}

/** Where a planet is at time `t` (seconds), relative to its star. */
export function orbitPosition(p: PlanetLayout, t: number): [number, number, number] {
	const a = p.phase + t * p.speed;
	const x = Math.cos(a) * p.orbitRadius;
	const z = Math.sin(a) * p.orbitRadius;
	return [x, z * Math.sin(p.inclination), z * Math.cos(p.inclination)];
}
