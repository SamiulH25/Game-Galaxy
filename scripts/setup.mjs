#!/usr/bin/env node
/**
 * First-time setup — Windows, Linux, macOS.
 * Usage: node scripts/setup.mjs [--build]
 */
import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';
import { ensureBackendEnv } from './ensure-env.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const backend = join(root, 'backend');
const frontend = join(root, 'frontend');
const isWin = process.platform === 'win32';
const venvDir = join(backend, 'venv');
const venvPython = join(venvDir, isWin ? 'Scripts/python.exe' : 'bin/python');
const venvPip = join(venvDir, isWin ? 'Scripts/pip.exe' : 'bin/pip');
const withBuild = process.argv.includes('--build');

function run(cmd, args, opts = {}) {
  // Bare commands (npm, python) need shell on Windows; full paths with spaces must not.
  const shell = opts.shell ?? (isWin && !/[\\/]/.test(cmd));
  const r = spawnSync(cmd, args, { stdio: 'inherit', cwd: opts.cwd ?? root, shell, env: { ...process.env, ...opts.env } });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

function runOk(cmd, args, opts = {}) {
  const shell = opts.shell ?? (isWin && !/[\\/]/.test(cmd));
  return spawnSync(cmd, args, { stdio: 'pipe', cwd: opts.cwd ?? root, shell, encoding: 'utf8' });
}

function log(msg) {
  console.log(`[setup] ${msg}`);
}

function need(cmd, name) {
  const r = runOk(cmd, ['--version']);
  if (r.status !== 0) {
    console.error(`[setup] Missing ${name}. Install it and re-run setup.`);
    process.exit(1);
  }
  log(`Found ${name}: ${(r.stdout || r.stderr || '').trim().split('\n')[0]}`);
}

log('Game Galaxy 2.0 — setup');
need('node', 'Node.js');
need(isWin ? 'python' : 'python3', 'Python');

const py = isWin ? 'python' : 'python3';

if (!existsSync(venvPython)) {
  log('Creating Python virtualenv in backend/venv ...');
  run(py, ['-m', 'venv', venvDir]);
}

log('Installing Python dependencies ...');
run(venvPip, ['install', '-r', 'requirements.txt'], { cwd: backend });

const envPath = join(backend, '.env');
try {
  const { created, secretGenerated } = ensureBackendEnv(backend);
  if (created) log('Created backend/.env from .env.example');
  if (secretGenerated) log('Generated random SECRET_KEY in backend/.env');
} catch (err) {
  if (!existsSync(envPath)) {
    console.warn('[setup] No backend/.env — copy backend/.env.example to backend/.env');
  } else {
    throw err;
  }
}

log('Running database migrations ...');
run(venvPython, ['-m', 'alembic', 'upgrade', 'head'], { cwd: backend });

log('Installing frontend dependencies ...');
run(isWin ? 'npm.cmd' : 'npm', ['install'], { cwd: frontend });

if (withBuild) {
  log('Building frontend for production ...');
  run(isWin ? 'npm.cmd' : 'npm', ['run', 'build'], { cwd: frontend });
}

mkdirSync(join(root, 'logs'), { recursive: true });

console.log('');
console.log('Setup complete.');
console.log('  Dev:        npm run dev');
console.log('  Production: npm run start:prod');
console.log('  Docker:     docker compose up --build');
console.log('');
