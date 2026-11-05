import { error } from '@sveltejs/kit';
import type { GameInfo, PublicUser } from '$lib/types';
import { getCatalog, limits } from './context';

const MAX_BODY = 300 * 1024;

export function requireUser(locals: App.Locals): PublicUser {
	if (!locals.user) error(401, 'Sign in to do that');
	return locals.user;
}

export function requireGame(id: string): GameInfo {
	const game = getCatalog().game(id);
	if (!game) error(404, 'Unknown game');
	return game;
}

/** Parse a JSON body. Requiring `application/json` also forces a CORS preflight for cross-site requests. */
export async function readJson(request: Request): Promise<Record<string, unknown>> {
	if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) error(415, 'Expected application/json');
	const length = Number(request.headers.get('content-length') ?? 0);
	if (length > MAX_BODY) error(413, 'Payload too large');
	const text = await request.text();
	if (text.length > MAX_BODY) error(413, 'Payload too large');
	let body: unknown;
	try {
		body = JSON.parse(text);
	} catch {
		error(400, 'Invalid JSON');
	}
	if (!body || typeof body !== 'object' || Array.isArray(body)) error(400, 'Expected a JSON object');
	return body as Record<string, unknown>;
}

export function throttleWrites(key: string): void {
	if (!limits.writes.take(key)) error(429, 'Slow down — too many requests');
}
