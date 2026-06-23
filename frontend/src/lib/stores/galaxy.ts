import { writable, derived } from 'svelte/store';
import { fetchGames, fetchSystems } from '$lib/api';

export const systems = writable<any[]>([]);
export const games = writable<any[]>([]);
export const currentSystemId = writable<string | null>(null);
export const selectedPlanet = writable<any>(null);
export const showAuth = writable<boolean>(false);
export const showGame = writable<any>(null);
export const hasPlayedGame = writable<boolean>(false);

export const currentSystem = derived(
  [systems, currentSystemId],
  ([$systems, $id]) => $systems.find(s => s.id === $id) || null
);

export const filteredGames = derived(
  [games, currentSystemId],
  ([$games, $id]) => $id ? $games.filter(g => g.solarSystemId === $id) : $games
);

export function markGamePlayed() {
  hasPlayedGame.set(true);
}

export async function loadGalaxyData() {
  const [g, s] = await Promise.all([fetchGames(), fetchSystems()]);
  games.set(g);
  systems.set(s);
  if (s.length > 0) {
    currentSystemId.set(s[0].id);
  }
}
