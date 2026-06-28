#!/usr/bin/env node
/**
 * Production server — builds frontend, runs unified FastAPI host.
 * Usage: node scripts/start-production.mjs
 */
import { existsSync, readFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { ensureBackendEnv } from './ensure-env.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const backend = join(root, 'backend');
const frontend = join(root, 'frontend');
const logs = join(root, 'logs');
const isWin = process.platform === 'win32';
const venvPython = join(backend, 'venv', isWin ? 'Scripts/python.exe' : 'bin/python');

function log(msg) {
  console.log(`[prod] ${msg}`);
}

function loadEnv() {
  const envPath = join(backend, '.env');
  const out = { ...process.env };
  if (!existsSync(envPath)) return out;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 1) continue;
    const key = t.slice(0, i).trim();
    const val = t.slice(i + 1).trim();
    out[key] = val;
  }
  return out;
}

function runSync(cmd, args, cwd) {
  const shell = isWin && !/[\\/]/.test(cmd);
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, stdio: 'inherit', shell });
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`exit ${code}`))));
    child.on('error', reject);
  });
}

if (!existsSync(venvPython)) {
  console.error('[prod] Virtualenv not found. Run: npm run setup');
  process.exit(1);
}

const { secretGenerated } = ensureBackendEnv(backend);
if (secretGenerated) log('Generated random SECRET_KEY in backend/.env');

const env = loadEnv();
const host = env.HOST || '0.0.0.0';
const port = env.PORT || '4321';

mkdirSync(logs, { recursive: true });

log('Building frontend ...');
await runSync(isWin ? 'npm.cmd' : 'npm', ['run', 'build'], frontend);

log(`Starting server on http://${host === '0.0.0.0' ? 'localhost' : host}:${port} ...`);
log('Serves: site + /games/* + /api/*');
log('Press Ctrl+C to stop');

const server = spawn(
  venvPython,
  ['-m', 'uvicorn', 'app.main:app', '--host', host, '--port', port, '--log-level', 'info'],
  { cwd: backend, stdio: 'inherit', env, shell: false }
);

const shutdown = () => {
  if (!server.killed) server.kill();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
server.on('exit', (code) => process.exit(code ?? 0));
