/**
 * Ensure backend/.env exists and has a non-default SECRET_KEY.
 */
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { randomBytes } from 'crypto';
import { join } from 'path';

const DEFAULT_SECRETS = new Set([
  'change-me-in-production',
  'dev-secret-not-for-production',
  '',
]);

export function generateSecretKey() {
  return randomBytes(32).toString('hex');
}

/**
 * @param {string} backendDir - path to backend/
 * @returns {{ created: boolean, secretGenerated: boolean }}
 */
export function ensureBackendEnv(backendDir) {
  const envPath = join(backendDir, '.env');
  const envExample = join(backendDir, '.env.example');
  let created = false;
  let secretGenerated = false;

  if (!existsSync(envPath)) {
    if (!existsSync(envExample)) {
      throw new Error(`Missing ${envPath} and ${envExample}`);
    }
    copyFileSync(envExample, envPath);
    created = true;
  }

  let content = readFileSync(envPath, 'utf8');
  const match = content.match(/^SECRET_KEY=(.*)$/m);
  const current = match ? match[1].trim() : '';

  if (!DEFAULT_SECRETS.has(current)) {
    return { created, secretGenerated };
  }

  const secret = generateSecretKey();
  if (match) {
    content = content.replace(/^SECRET_KEY=.*$/m, `SECRET_KEY=${secret}`);
  } else {
    content = content.endsWith('\n') ? content : `${content}\n`;
    content += `SECRET_KEY=${secret}\n`;
  }
  writeFileSync(envPath, content, 'utf8');
  secretGenerated = true;
  return { created, secretGenerated };
}
