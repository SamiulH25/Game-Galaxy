import { z } from 'zod';
import {
	ACHIEVEMENT_ICONS,
	PLANET_KINDS,
	type Achievement,
	type AchievementIcon,
	type PlanetKind,
	type PlanetVisual,
	type Scoring
} from '$lib/types';
import { hashString, hslToHex, mulberry32 } from '$lib/random';

export const GAME_ID = /^[a-z0-9][a-z0-9-]{0,63}$/;
const SLUG = /^[a-z0-9][a-z0-9-]{0,47}$/;
const ACH_ID = /^[a-z0-9][a-z0-9_-]{0,47}$/;
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'expected a #rrggbb colour');

/** A path inside the game folder: relative, no `..`, no hidden segments. */
const relPath = z
	.string()
	.min(1)
	.max(200)
	.refine(
		(p) => !p.startsWith('/') && !p.includes('\\') && p.split('/').every((s) => s && s !== '..' && !s.startsWith('.')),
		'must be a relative path inside the game folder'
	);

const PlanetSchema = z.strictObject({
	name: z.string().min(1).max(40).optional(),
	kind: z.enum(PLANET_KINDS).optional(),
	color: hex.optional(),
	accent: hex.optional(),
	size: z.number().min(0.4).max(2.5).optional(),
	rings: z.union([z.boolean(), z.strictObject({ color: hex.optional(), tilt: z.number().min(-1.5).max(1.5).optional() })]).optional(),
	moons: z.number().int().min(0).max(4).optional(),
	atmosphere: z.union([z.boolean(), hex]).optional()
});

const AchievementSchema = z.strictObject({
	id: z.string().regex(ACH_ID, 'lowercase letters, digits, _ or -'),
	title: z.string().min(1).max(60),
	description: z.string().min(1).max(200),
	icon: z.string().optional(),
	secret: z.boolean().optional()
});

export const GameManifestSchema = z.strictObject({
	$schema: z.string().optional(),
	title: z.string().min(1).max(60),
	tagline: z.string().max(120).optional(),
	description: z.string().min(1).max(2000),
	system: z.string().regex(SLUG),
	genres: z.array(z.string().min(1).max(24)).max(6).optional(),
	controls: z.string().max(400).optional(),
	entry: relPath.optional(),
	cover: relPath.optional(),
	order: z.number().optional(),
	hidden: z.boolean().optional(),
	planet: PlanetSchema.optional(),
	scoring: z
		.strictObject({
			label: z.string().min(1).max(24).optional(),
			order: z.enum(['desc', 'asc']).optional(),
			format: z.enum(['number', 'time']).optional()
		})
		.optional(),
	achievements: z.array(AchievementSchema).max(100).optional()
});
export type GameManifest = z.infer<typeof GameManifestSchema>;

export const SystemsFileSchema = z.strictObject({
	$schema: z.string().optional(),
	systems: z
		.array(
			z.strictObject({
				id: z.string().regex(SLUG),
				name: z.string().min(1).max(40),
				description: z.string().max(400).optional(),
				star: z.strictObject({ color: hex, size: z.number().min(0.5).max(2).optional() }),
				position: z.tuple([z.number(), z.number()]).optional()
			})
		)
		.max(64)
});
export type SystemsFile = z.infer<typeof SystemsFileSchema>;

export function formatZodError(error: z.ZodError): string {
	return error.issues
		.slice(0, 4)
		.map((i) => `${i.path.length ? i.path.join('.') : '(root)'}: ${i.message}`)
		.join('; ');
}

// Per-kind defaults: [hue range, saturation, lightness] for the base and the accent offset.
const KIND_STYLE: Record<PlanetKind, { hue: [number, number]; s: number; l: number; accentShift: number; atmosphere: boolean; ringChance: number }> = {
	terran: { hue: [90, 160], s: 0.45, l: 0.4, accentShift: 110, atmosphere: true, ringChance: 0.1 },
	rocky: { hue: [15, 45], s: 0.3, l: 0.45, accentShift: 10, atmosphere: false, ringChance: 0.15 },
	gas: { hue: [20, 50], s: 0.55, l: 0.58, accentShift: -25, atmosphere: true, ringChance: 0.6 },
	ice: { hue: [180, 215], s: 0.4, l: 0.78, accentShift: 20, atmosphere: true, ringChance: 0.25 },
	lava: { hue: [0, 20], s: 0.35, l: 0.16, accentShift: 22, atmosphere: false, ringChance: 0.1 },
	ocean: { hue: [195, 230], s: 0.6, l: 0.38, accentShift: -150, atmosphere: true, ringChance: 0.15 }
};

/** Fill in every planet visual the manifest leaves out, deterministically from the game id. */
export function resolvePlanet(id: string, title: string, planet: GameManifest['planet'] = {}): PlanetVisual {
	const rand = mulberry32(hashString(id));
	const seed = rand();
	const kind: PlanetKind = planet.kind ?? PLANET_KINDS[Math.floor(rand() * PLANET_KINDS.length)];
	const style = KIND_STYLE[kind];
	const hue = style.hue[0] + rand() * (style.hue[1] - style.hue[0]);
	const color = planet.color ?? hslToHex(hue, style.s, style.l);
	const accent = planet.accent ?? hslToHex((hue + style.accentShift + 360) % 360, Math.min(1, style.s + 0.15), Math.min(0.85, style.l + 0.12));

	let rings: PlanetVisual['rings'] = null;
	const wantsRings = planet.rings ?? rand() < style.ringChance;
	if (wantsRings) {
		const r = typeof planet.rings === 'object' ? planet.rings : {};
		rings = { color: r.color ?? hslToHex((hue + 20) % 360, 0.25, 0.72), tilt: r.tilt ?? (rand() - 0.5) * 0.9 };
	}

	let atmosphere: string | null = null;
	if (typeof planet.atmosphere === 'string') atmosphere = planet.atmosphere;
	else if (planet.atmosphere ?? style.atmosphere) atmosphere = hslToHex((hue + 180 + style.accentShift / 3) % 360, 0.7, 0.65);

	return {
		name: planet.name ?? title,
		kind,
		color: color.toLowerCase(),
		accent: accent.toLowerCase(),
		size: planet.size ?? Math.round((0.75 + rand() * 0.6) * 100) / 100,
		rings,
		moons: planet.moons ?? Math.floor(rand() * 2.2),
		atmosphere: atmosphere?.toLowerCase() ?? null,
		seed
	};
}

export function resolveScoring(scoring: GameManifest['scoring']): Scoring | null {
	if (!scoring) return null;
	return { label: scoring.label ?? 'Score', order: scoring.order ?? 'desc', format: scoring.format ?? 'number' };
}

export function resolveAchievements(list: GameManifest['achievements'] = [], warn: (msg: string) => void): Achievement[] {
	const seen = new Set<string>();
	const out: Achievement[] = [];
	for (const a of list) {
		if (seen.has(a.id)) {
			warn(`duplicate achievement id "${a.id}" ignored`);
			continue;
		}
		seen.add(a.id);
		let icon: AchievementIcon = 'star';
		if (a.icon) {
			if ((ACHIEVEMENT_ICONS as readonly string[]).includes(a.icon)) icon = a.icon as AchievementIcon;
			else warn(`achievement "${a.id}" uses unknown icon "${a.icon}" (using "star")`);
		}
		out.push({ id: a.id, title: a.title, description: a.description, icon, secret: a.secret ?? false });
	}
	return out;
}
