import { writable, derived, get } from 'svelte/store';
import { fetchAchievements, fetchProfile, fetchLeaderboard } from '$lib/api';
import { isAuthenticated } from '$lib/stores/auth';

export const achievements = writable<{
  per_game: Record<string, any[]>;
  universal: any[];
  unlocked: string[];
} | null>(null);

export const profile = writable<any>(null);
export const profileLoading = writable(false);
let profileLoadedAt = 0;
const PROFILE_TTL_MS = 30_000;

export const leaderboards = writable<Record<string, any>>({});
const leaderboardLoadedAt: Record<string, number> = {};
const LEADERBOARD_TTL_MS = 60_000;

export const profileStats = derived(profile, ($p) => $p?.stats || null);
export const recentAchievements = derived(profile, ($p) => $p?.recent_achievements || []);

export async function loadAchievements() {
  achievements.set(null);
  try {
    const data = await fetchAchievements();
    achievements.set(data);
  } catch { /* ignore */ }
}

export async function loadProfile(force = false) {
  if (!force && profileLoadedAt && Date.now() - profileLoadedAt < PROFILE_TTL_MS && get(profile)) return;
  profileLoading.set(true);
  try {
    const data = await fetchProfile();
    profile.set(data);
    profileLoadedAt = Date.now();
  } catch { /* ignore */ }
  profileLoading.set(false);
}

export async function loadLeaderboard(gameId: string, view = 'best', limit = 50, force = false) {
  const cacheKey = `${gameId}:${view}`;
  if (
    !force
    && leaderboardLoadedAt[cacheKey]
    && Date.now() - leaderboardLoadedAt[cacheKey] < LEADERBOARD_TTL_MS
    && get(leaderboards)[gameId]
  ) {
    return;
  }
  try {
    const data = await fetchLeaderboard(gameId, view, limit);
    leaderboards.update((l) => ({ ...l, [gameId]: data }));
    leaderboardLoadedAt[cacheKey] = Date.now();
  } catch { /* ignore */ }
}
