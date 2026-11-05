#!/usr/bin/env node
// Scaffold a new game folder from templates/game.
//   npm run new-game -- <id> [--title "My Game"] [--system <system-id>]
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const flag = (name) => {
	const i = args.indexOf(`--${name}`);
	if (i === -1) return undefined;
	const value = args[i + 1];
	args.splice(i, 2);
	return value;
};

const title = flag('title');
const systemArg = flag('system');
const id = args[0];

function fail(message) {
	console.error(`\n  ✖ ${message}\n\n  Usage: npm run new-game -- <id> [--title "My Game"] [--system <system-id>]\n`);
	process.exit(1);
}

if (!id) fail('Missing game id.');
if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(id)) fail(`"${id}" is not a valid id: use lowercase letters, digits and dashes.`);

const gamesDir = path.resolve(process.env.GAMES_DIR || path.join(root, 'games'));
const target = path.join(gamesDir, id);
if (fs.existsSync(target)) fail(`${path.relative(root, target)} already exists.`);

let systems = [];
try {
	systems = JSON.parse(fs.readFileSync(path.join(gamesDir, 'systems.json'), 'utf8')).systems ?? [];
} catch {
	fail(`Could not read ${path.join(gamesDir, 'systems.json')}.`);
}
const system = systemArg ?? systems[0]?.id;
if (!systems.some((s) => s.id === system)) fail(`Unknown system "${system}". Known: ${systems.map((s) => s.id).join(', ')}`);

const niceTitle =
	title ??
	id
		.split('-')
		.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
		.join(' ');

fs.cpSync(path.join(root, 'templates', 'game'), target, { recursive: true });
for (const file of ['game.json', 'index.html']) {
	const p = path.join(target, file);
	const text = fs
		.readFileSync(p, 'utf8')
		.replaceAll('__TITLE__', file === 'game.json' ? JSON.stringify(niceTitle).slice(1, -1) : niceTitle.replace(/[<&>]/g, ''))
		.replaceAll('__SYSTEM__', system);
	fs.writeFileSync(p, text);
}
// The template points at ../../schemas from templates/game; from games/<id> it is the same depth.

console.log(`\n  ✔ Created ${path.relative(root, target)}/ in system "${system}".`);
console.log(`    It appears in the galaxy within a few seconds (no restart needed).`);
console.log(`    Edit game.json for the title, planet look, scoring and achievements.\n`);
