#!/usr/bin/env node
/**
 * Trigger a games catalog rescan on the running server.
 * Usage: npm run games:rescan [-- --url http://localhost:4321]
 */
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const backendEnv = join(root, 'backend', '.env');

function readEnvValue(key) {
  if (!existsSync(backendEnv)) return '';
  const match = readFileSync(backendEnv, 'utf8').match(new RegExp(`^${key}=(.*)$`, 'm'));
  return match ? match[1].trim() : '';
}

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : '';
}

const baseUrl = (
  argValue('--url') ||
  process.env.GAME_GALAXY_URL ||
  `http://localhost:${readEnvValue('PORT') || process.env.PORT || '4321'}`
).replace(/\/$/, '');

const token = process.env.GAMES_RESCAN_TOKEN || readEnvValue('GAMES_RESCAN_TOKEN');

const headers = {};
if (token) headers['X-Games-Rescan-Token'] = token;

const res = await fetch(`${baseUrl}/api/games/rescan`, { method: 'POST', headers });
const body = await res.text();

if (!res.ok) {
  console.error(`[games:rescan] ${res.status} ${body}`);
  if (res.status === 403) {
    console.error('[games:rescan] Set DEBUG=true or GAMES_RESCAN_TOKEN in backend/.env');
  }
  process.exit(1);
}

let data;
try {
  data = JSON.parse(body);
} catch {
  data = { raw: body };
}

console.log(`[games:rescan] OK — ${data.count ?? '?'} game(s), generation ${data.generation ?? '?'}`);
