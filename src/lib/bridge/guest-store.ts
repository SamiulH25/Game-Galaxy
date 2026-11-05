/**
 * Progress for players who haven't signed in, kept in this browser's localStorage.
 * Imported into the account (and cleared) the next time they sign in.
 */

export interface GuestGame {
	save?: unknown;
	savedAt?: number;
	best?: number;
	achievements?: string[];
	plays?: number;
	lastPlayedAt?: number;
}

interface GuestState {
	version: 1;
	games: Record<string, GuestGame>;
}

const KEY = 'galaxy:guest:v1';
let memory: GuestState | null = null; // fallback when storage is blocked

function read(): GuestState {
	try {
		const raw = localStorage.getItem(KEY);
		if (raw) {
			const parsed = JSON.parse(raw);
			if (parsed && parsed.version === 1 && parsed.games && typeof parsed.games === 'object') return parsed;
		}
		return { version: 1, games: {} };
	} catch {
		return memory ?? { version: 1, games: {} };
	}
}

function write(state: GuestState): void {
	try {
		localStorage.setItem(KEY, JSON.stringify(state));
	} catch {
		memory = state;
	}
}

export const guestStore = {
	get(gameId: string): GuestGame {
		return read().games[gameId] ?? {};
	},

	update(gameId: string, fn: (g: GuestGame) => GuestGame): GuestGame {
		const state = read();
		const next = fn({ ...(state.games[gameId] ?? {}) });
		state.games[gameId] = next;
		write(state);
		return next;
	},

	all(): Record<string, GuestGame> {
		return read().games;
	},

	hasProgress(): boolean {
		return Object.values(read().games).some(
			(g) => g.save !== undefined || g.best !== undefined || (g.achievements?.length ?? 0) > 0 || (g.plays ?? 0) > 0
		);
	},

	clear(gameIds?: string[]): void {
		if (!gameIds) {
			write({ version: 1, games: {} });
			return;
		}
		const state = read();
		for (const id of gameIds) delete state.games[id];
		write(state);
	}
};
