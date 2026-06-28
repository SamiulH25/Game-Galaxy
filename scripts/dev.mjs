#!/usr/bin/env node
/**
 * Development — backend (venv uvicorn) + Vite frontend.
 * Usage: node scripts/dev.mjs
 */
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { networkInterfaces } from 'os';
import { ensureBackendEnv } from './ensure-env.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const backend = join(root, 'backend');
const frontend = join(root, 'frontend');
const isWin = process.platform === 'win32';
const venvPython = join(backend, 'venv', isWin ? 'Scripts/python.exe' : 'bin/python');

if (!existsSync(venvPython)) {
  console.error('[dev] Virtualenv not found. Run: npm run setup');
  process.exit(1);
}

const { secretGenerated } = ensureBackendEnv(backend);
if (secretGenerated) console.log('[dev] Generated random SECRET_KEY in backend/.env');

function lanAddresses() {
  const ips = new Set();
  for (const addrs of Object.values(networkInterfaces())) {
    if (!addrs) continue;
    for (const a of addrs) {
      if (a.family === 'IPv4' && !a.internal) ips.add(a.address);
    }
  }
  return [...ips];
}

function start(name, cmd, args, cwd, extraEnv = {}) {
  const shell = isWin && !/[\\/]/.test(cmd);
  const child = spawn(cmd, args, {
    cwd,
    stdio: 'inherit',
    shell,
    env: { ...process.env, ...extraEnv },
  });
  child.on('exit', (code) => {
    if (code && code !== 0) console.error(`[dev] ${name} exited with code ${code}`);
    shutdown();
  });
  return child;
}

const children = [];
const shutdown = () => {
  for (const c of children) {
    if (!c.killed) c.kill();
  }
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

console.log('[dev] Backend  → http://localhost:8000 (LAN: 0.0.0.0:8000)');
console.log('[dev] Frontend → http://localhost:5173 (proxies /api and /games)');
for (const ip of lanAddresses()) {
  console.log(`[dev] LAN      → http://${ip}:5173`);
}
console.log('[dev] Press Ctrl+C to stop\n');

children.push(
  start('backend', venvPython, ['-m', 'uvicorn', 'app.main:app', '--reload', '--host', '0.0.0.0', '--port', '8000'], backend, {
    GAMES_WATCH: 'true',
    GAMES_LIVE_RELOAD: 'true',
    HOST: '0.0.0.0',
  })
);
children.push(start('frontend', isWin ? 'npm.cmd' : 'npm', ['run', 'dev'], frontend));
