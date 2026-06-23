import { writable, derived } from 'svelte/store';
import { fetchAchievements, fetchProfile, fetchLeaderboard } from '$lib/api';
import { isAuthenticated } from '$lib/stores/auth';

export const achievements = writable<{
  per_game: Record<string, any[]>;
  universal: any[];
  unlocked: string[];
} | null>(null);

export const profile = writable<any>(null);
export const profileLoading = writable(false);

export const leaderboards = writable<Record<string, any>>({});

export const profileStats = derived(profile, ($p) => $p?.stats || null);
export const recentAchievements = derived(profile, ($p) => $p?.recent_achievements || []);

export async function loadAchievements() {
  achievements.set(null);
  try {
    const data = await fetchAchievements();
    achievements.set(data);
  } catch { /* ignore */ }
}

export async function loadProfile() {
  profileLoading.set(true);
  try {
    const data = await fetchProfile();
    profile.set(data);
  } catch { /* ignore */ }
  profileLoading.set(false);
}

export async function loadLeaderboard(gameId: string, view = 'best', limit = 50) {
  try {
    const data = await fetchLeaderboard(gameId, view, limit);
    leaderboards.update((l) => ({ ...l, [gameId]: data }));
  } catch { /* ignore */ }
}
