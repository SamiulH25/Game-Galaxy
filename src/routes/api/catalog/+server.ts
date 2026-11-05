import { json } from '@sveltejs/kit';
import { getCatalog } from '$lib/server/context';

export function GET() {
	const { systems, games, scannedAt } = getCatalog().get();
	return json({ systems, games, scannedAt });
}
