import { i as writable, n as get, t as derived } from "./shared2.js";
import "./index-server2.js";
import { B as fetchAchievements, H as fetchProfile, V as fetchLeaderboard } from "./progression.js";
//#region src/lib/stores/social.ts
var achievements = writable(null);
var profile = writable(null);
var profileLoading = writable(false);
var profileLoadedAt = 0;
var PROFILE_TTL_MS = 3e4;
var leaderboards = writable({});
var leaderboardLoadedAt = {};
var LEADERBOARD_TTL_MS = 6e4;
var profileStats = derived(profile, ($p) => $p?.stats || null);
derived(profile, ($p) => $p?.recent_achievements || []);
async function loadAchievements() {
	achievements.set(null);
	try {
		const data = await fetchAchievements();
		achievements.set(data);
	} catch {}
}
async function loadProfile(force = false) {
	if (!force && profileLoadedAt && Date.now() - profileLoadedAt < PROFILE_TTL_MS && get(profile)) return;
	profileLoading.set(true);
	try {
		const data = await fetchProfile();
		profile.set(data);
		profileLoadedAt = Date.now();
	} catch {}
	profileLoading.set(false);
}
async function loadLeaderboard(gameId, view = "best", limit = 50, force = false) {
	const cacheKey = `${gameId}:${view}`;
	if (!force && leaderboardLoadedAt[cacheKey] && Date.now() - leaderboardLoadedAt[cacheKey] < LEADERBOARD_TTL_MS && get(leaderboards)[gameId]) return;
	try {
		const data = await fetchLeaderboard(gameId, view, limit);
		leaderboards.update((l) => ({
			...l,
			[gameId]: data
		}));
		leaderboardLoadedAt[cacheKey] = Date.now();
	} catch {}
}
//#endregion
export { loadProfile as a, loadLeaderboard as i, leaderboards as n, profile as o, loadAchievements as r, profileStats as s, achievements as t };
