import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { eq } from 'drizzle-orm';
import type { DB } from './db';
import { sessions, users } from './db/schema';
import type { PublicUser } from '$lib/types';

const scrypt = promisify(crypto.scrypt) as (pw: crypto.BinaryLike, salt: crypto.BinaryLike, len: number, opts: crypto.ScryptOptions) => Promise<Buffer>;

// N=2^15, r=8, p=1 → ~32 MiB, ~50–100 ms per hash on a typical server.
const SCRYPT = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const KEY_LEN = 32;

export const SESSION_COOKIE = 'gg_session';
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const SESSION_RENEW_MS = 15 * 24 * 60 * 60 * 1000;

export const USERNAME_RE = /^[A-Za-z0-9_-]{3,24}$/;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 200;

export async function hashPassword(password: string): Promise<string> {
	const salt = crypto.randomBytes(16);
	const key = await scrypt(password.normalize('NFKC'), salt, KEY_LEN, SCRYPT);
	return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString('base64url')}$${key.toString('base64url')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
	const [algo, n, r, p, saltB64, keyB64] = stored.split('$');
	if (algo !== 'scrypt' || !saltB64 || !keyB64) return false;
	const expected = Buffer.from(keyB64, 'base64url');
	const actual = await scrypt(password.normalize('NFKC'), Buffer.from(saltB64, 'base64url'), expected.length, {
		N: Number(n),
		r: Number(r),
		p: Number(p),
		maxmem: SCRYPT.maxmem
	});
	return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

// A real hash to compare against when the username doesn't exist, so a login
// for an unknown user takes as long as a wrong password.
let dummyHash: Promise<string> | null = null;
function getDummyHash() {
	return (dummyHash ??= hashPassword(crypto.randomBytes(16).toString('hex')));
}

const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex');

export type SignupError = 'invalid-username' | 'invalid-password' | 'taken';

export async function createUser(db: DB, username: string, password: string): Promise<{ ok: true; user: PublicUser } | { ok: false; error: SignupError }> {
	if (!USERNAME_RE.test(username)) return { ok: false, error: 'invalid-username' };
	if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) return { ok: false, error: 'invalid-password' };
	const key = username.toLowerCase();
	if (db.select({ id: users.id }).from(users).where(eq(users.usernameKey, key)).get()) return { ok: false, error: 'taken' };

	const user = { id: crypto.randomUUID(), username, usernameKey: key, passwordHash: await hashPassword(password), createdAt: new Date() };
	try {
		db.insert(users).values(user).run();
	} catch (err) {
		// Lost a race with a concurrent signup for the same name.
		if (err instanceof Error && /UNIQUE/i.test(err.message)) return { ok: false, error: 'taken' };
		throw err;
	}
	return { ok: true, user: { id: user.id, username } };
}

export async function authenticate(db: DB, username: string, password: string): Promise<PublicUser | null> {
	const row = db.select().from(users).where(eq(users.usernameKey, username.toLowerCase())).get();
	if (!row) {
		await verifyPassword(password, await getDummyHash());
		return null;
	}
	return (await verifyPassword(password, row.passwordHash)) ? { id: row.id, username: row.username } : null;
}

/** Create a session and return the raw token for the cookie. */
export function createSession(db: DB, userId: string): { token: string; expiresAt: Date } {
	const token = crypto.randomBytes(32).toString('base64url');
	const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
	db.insert(sessions).values({ id: sha256(token), userId, expiresAt }).run();
	return { token, expiresAt };
}

/**
 * Look up the user for a session token. Expired sessions are deleted.
 * Sessions are extended when they are more than halfway to expiry; `renewedUntil` tells the caller to refresh the cookie.
 */
export function validateSession(db: DB, token: string): { user: PublicUser; renewedUntil: Date | null } | null {
	if (!token || token.length > 128) return null;
	const id = sha256(token);
	const row = db
		.select({ userId: sessions.userId, expiresAt: sessions.expiresAt, username: users.username })
		.from(sessions)
		.innerJoin(users, eq(users.id, sessions.userId))
		.where(eq(sessions.id, id))
		.get();
	if (!row) return null;
	const now = Date.now();
	if (row.expiresAt.getTime() <= now) {
		db.delete(sessions).where(eq(sessions.id, id)).run();
		return null;
	}
	let renewedUntil: Date | null = null;
	if (row.expiresAt.getTime() - now < SESSION_RENEW_MS) {
		renewedUntil = new Date(now + SESSION_TTL_MS);
		db.update(sessions).set({ expiresAt: renewedUntil }).where(eq(sessions.id, id)).run();
	}
	return { user: { id: row.userId, username: row.username }, renewedUntil };
}

export function invalidateSession(db: DB, token: string): void {
	db.delete(sessions).where(eq(sessions.id, sha256(token))).run();
}

export function getMemberSince(db: DB, userId: string): number | null {
	return db.select({ createdAt: users.createdAt }).from(users).where(eq(users.id, userId)).get()?.createdAt.getTime() ?? null;
}
