import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDatabase } from '$lib/server/db';

export const memoryDb = () => openDatabase(':memory:');

/** Create a throwaway games folder: { 'systems.json': {...}, 'my-game/game.json': {...}, 'my-game/index.html': '...' } */
export function tempGames(files: Record<string, unknown>): string {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gg-games-'));
	for (const [rel, content] of Object.entries(files)) {
		const p = path.join(dir, rel);
		fs.mkdirSync(path.dirname(p), { recursive: true });
		fs.writeFileSync(p, typeof content === 'string' ? content : JSON.stringify(content));
	}
	return dir;
}

export const SYSTEMS = { systems: [{ id: 'sol', name: 'Sol', star: { color: '#ffcc66' } }] };

export const manifest = (extra: Record<string, unknown> = {}) => ({
	title: 'Test Game',
	description: 'A game for tests.',
	system: 'sol',
	...extra
});
