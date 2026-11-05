import { json } from '@sveltejs/kit';
import { getCatalog, getDb } from '$lib/server/context';

export function GET() {
	getDb(); // throws if the database cannot be opened
	const catalog = getCatalog().get();
	return json({ ok: true, games: catalog.games.length, systems: catalog.systems.length });
}
