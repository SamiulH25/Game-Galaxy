import { api } from '$lib/api';
import { guestStore } from '$lib/bridge/guest-store';
import type { PublicUser } from '$lib/types';

/** Unlocked achievement ids (with unlock time when known) for the current player. */
export async function loadUnlocked(gameId: string, user: PublicUser | null): Promise<Map<string, number | null>> {
	if (!user) return new Map((guestStore.get(gameId).achievements ?? []).map((id) => [id, null]));
	const res = await api<{ unlocked: { id: string; unlockedAt: number }[] }>(`/api/games/${encodeURIComponent(gameId)}/achievements`);
	return new Map(res.unlocked.map((a) => [a.id, a.unlockedAt]));
}
