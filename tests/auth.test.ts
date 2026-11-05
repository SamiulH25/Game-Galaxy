import { describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { authenticate, createSession, createUser, hashPassword, invalidateSession, validateSession, verifyPassword } from '$lib/server/auth';
import { sessions } from '$lib/server/db/schema';
import { memoryDb } from './helpers';

describe('passwords', () => {
	it('hashes with a random salt and verifies', async () => {
		const a = await hashPassword('hunter2-long');
		const b = await hashPassword('hunter2-long');
		expect(a).not.toEqual(b);
		expect(await verifyPassword('hunter2-long', a)).toBe(true);
		expect(await verifyPassword('hunter3-long', a)).toBe(false);
		expect(await verifyPassword('x', 'garbage')).toBe(false);
	});
});

describe('accounts and sessions', () => {
	it('creates users, rejects duplicates case-insensitively and validates input', async () => {
		const db = memoryDb();
		const ok = await createUser(db, 'Nova', 'password123');
		expect(ok.ok).toBe(true);
		expect(await createUser(db, 'nova', 'password123')).toEqual({ ok: false, error: 'taken' });
		expect(await createUser(db, 'no', 'password123')).toEqual({ ok: false, error: 'invalid-username' });
		expect(await createUser(db, 'has space', 'password123')).toEqual({ ok: false, error: 'invalid-username' });
		expect(await createUser(db, 'Vega', 'short')).toEqual({ ok: false, error: 'invalid-password' });
		expect(await authenticate(db, 'NOVA', 'password123')).toMatchObject({ username: 'Nova' });
		expect(await authenticate(db, 'nova', 'wrong-pass')).toBeNull();
		expect(await authenticate(db, 'ghost', 'password123')).toBeNull();
	});

	it('issues, validates, renews and revokes sessions', async () => {
		const db = memoryDb();
		const res = await createUser(db, 'Orion', 'password123');
		if (!res.ok) throw new Error('setup');
		const { token } = createSession(db, res.user.id);
		expect(validateSession(db, token)?.user.username).toBe('Orion');
		expect(validateSession(db, token + 'x')).toBeNull();

		// Near expiry → renewed.
		db.update(sessions).set({ expiresAt: new Date(Date.now() + 1000 * 60) }).run();
		expect(validateSession(db, token)?.renewedUntil).toBeInstanceOf(Date);

		// Expired → deleted.
		db.update(sessions).set({ expiresAt: new Date(Date.now() - 1000) }).run();
		expect(validateSession(db, token)).toBeNull();
		expect(db.select().from(sessions).all()).toHaveLength(0);

		const second = createSession(db, res.user.id);
		invalidateSession(db, second.token);
		expect(validateSession(db, second.token)).toBeNull();
		expect(db.select().from(sessions).where(eq(sessions.userId, res.user.id)).all()).toHaveLength(0);
	});
});
