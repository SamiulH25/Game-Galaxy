#!/usr/bin/env node
/**
 * Scaffold a new game from games/000-template-game and register it with the host.
 *
 * Usage:
 *   npm run new-game -- my-cool-game
 *   npm run new-game -- my-cool-game --title "My Cool Game"
 *   npm run new-game -- my-cool-game --no-rescan
 */
import {
  cpSync,
  existsSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const gamesDir = join(root, 'games');
const templateDir = join(gamesDir, '000-template-game');

function readEnvValue(key) {
  const envPath = join(root, 'backend', '.env');
  if (!existsSync(envPath)) return '';
  const match = readFileSync(envPath, 'utf8').match(new RegExp(`^${key}=(.*)$`, 'm'));
  return match ? match[1].trim() : '';
}

function usage() {
  console.log(`Usage: npm run new-game -- <slug> [options]

Options:
  --title <name>     Display title (default: Title Case from slug)
  --system <id>      solarSystemId (default: alpha-centauri)
  --url <base>       Server URL for rescan (default: localhost:PORT)
  --no-rescan        Skip POST /api/games/rescan

Example:
  npm run new-game -- asteroid-rush --title "Asteroid Rush"
`);
  process.exit(1);
}

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : '';
}

function slugify(input) {
  return String(input)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function titleCase(slug) {
  return slug
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function nextGameNumber() {
  let max = -1;
  for (const name of readdirSync(gamesDir, { withFileTypes: true })) {
    if (!name.isDirectory()) continue;
    const m = name.name.match(/^(\d{3})-/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return String(max + 1).padStart(3, '0');
}

const positional = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const slugRaw = positional[0];
if (!slugRaw) usage();

const slug = slugify(slugRaw);
if (!slug) {
  console.error('[new-game] Invalid slug');
  usage();
}

const noRescan = process.argv.includes('--no-rescan');
const title = argValue('--title') || titleCase(slug);
const solarSystemId = argValue('--system') || 'alpha-centauri';
const gameId = `${nextGameNumber()}-${slug}`;
const dest = join(gamesDir, gameId);

if (!existsSync(templateDir)) {
  console.error(`[new-game] Template missing: ${templateDir}`);
  process.exit(1);
}

if (existsSync(dest)) {
  console.error(`[new-game] Already exists: ${dest}`);
  process.exit(1);
}

console.log(`[new-game] Creating ${gameId} …`);
cpSync(templateDir, dest, { recursive: true });

const manifestPath = join(dest, 'manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
manifest.id = gameId;
manifest.title = title;
manifest.planetName = `${title} Station`;
manifest.description = `Work in progress — ${title}`;
manifest.detailedDescription = manifest.description;
manifest.starter = false;
manifest.tags = ['wip'];
delete manifest.genre;
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');

const indexPath = join(dest, 'index.html');
if (existsSync(indexPath)) {
  let html = readFileSync(indexPath, 'utf8');
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${title} — Game Galaxy</title>`);
  writeFileSync(indexPath, html, 'utf8');
}

const port = readEnvValue('PORT') || '4321';
const baseUrl = (argValue('--url') || process.env.GAME_GALAXY_URL || `http://localhost:${port}`).replace(
  /\/$/,
  ''
);

console.log(`[new-game] Folder: games/${gameId}/`);
console.log(`[new-game] Play now: ${baseUrl}/games/${gameId}/index.html`);

if (!noRescan) {
  const rescan = spawnSync(process.execPath, [join(root, 'scripts', 'games-rescan.mjs'), '--url', baseUrl], {
    stdio: 'inherit',
    cwd: root,
  });
  if (rescan.status !== 0) {
    console.log('[new-game] Rescan failed — restart the server or run: npm run games:rescan');
  }
}

console.log('[new-game] Edit manifest.json, then refresh the galaxy (auto within ~15s if GAMES_WATCH=true).');
