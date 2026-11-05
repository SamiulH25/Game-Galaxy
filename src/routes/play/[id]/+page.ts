import { error } from '@sveltejs/kit';

export async function load({ params, parent }) {
	const { catalog } = await parent();
	const game = catalog.games.find((g) => g.id === params.id);
	if (!game) error(404, 'That game is not in the galaxy');
	return { game };
}
