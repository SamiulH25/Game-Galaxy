import { x as writable, y as derived } from "./index-server.js";
import "./index-server2.js";
import "./client.js";
//#region src/lib/api.js
/** @type {string | null} */
var _token = null;
/** @param {string | null} t */
function setApiToken(t) {
	_token = t;
}
var REQUEST_TIMEOUT = 15e3;
/**
* @param {string} path
* @param {RequestInit & {headers?: Record<string,string>}} [options]
*/
async function apiFetch(path, options = {}) {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
	const headers = { ...options.headers || {} };
	if (_token) headers["Authorization"] = `Bearer ${_token}`;
	if (options.body && !(options.body instanceof FormData)) headers["Content-Type"] = "application/json";
	try {
		const res = await fetch(path, {
			...options,
			headers,
			signal: controller.signal
		});
		clearTimeout(timeoutId);
		if (!res.ok) {
			const text = await res.text();
			throw new Error(text || `Request failed: ${res.status}`);
		}
		const ct = res.headers.get("content-type");
		if (ct && ct.includes("application/json")) return res.json();
		return res.text();
	} catch (err) {
		clearTimeout(timeoutId);
		if (err instanceof Error && err.name === "AbortError") throw new Error("Request timed out");
		throw err;
	}
}
function fetchMe() {
	return apiFetch("/api/auth/me");
}
function fetchGames() {
	return apiFetch("/api/games");
}
function fetchSystems() {
	return apiFetch("/api/games/systems");
}
function fetchAchievements() {
	return apiFetch("/api/achievements");
}
function fetchProfile() {
	return apiFetch("/api/profile");
}
//#endregion
//#region src/lib/stores/galaxy.ts
var systems = writable([]);
var games = writable([]);
var currentSystemId = writable(null);
var selectedPlanet = writable(null);
var showAuth = writable(false);
var showGame = writable(null);
var hasPlayedGame = writable(false);
derived([systems, currentSystemId], ([$systems, $id]) => $systems.find((s) => s.id === $id) || null);
derived([games, currentSystemId], ([$games, $id]) => $id ? $games.filter((g) => g.solarSystemId === $id) : $games);
async function loadGalaxyData() {
	const [g, s] = await Promise.all([fetchGames(), fetchSystems()]);
	games.set(g);
	systems.set(s);
	if (s.length > 0) currentSystemId.set(s[0].id);
}
//#endregion
//#region src/lib/stores/auth.ts
function getStoredToken() {
	if (typeof localStorage === "undefined") return null;
	return localStorage.getItem("gg_token");
}
var token = writable(getStoredToken());
var user = writable(null);
var isAuthenticated = derived(token, ($t) => $t !== null);
token.subscribe((val) => {
	setApiToken(val);
	if (typeof localStorage !== "undefined") if (val) localStorage.setItem("gg_token", val);
	else localStorage.removeItem("gg_token");
});
var stored = getStoredToken();
if (stored) {
	token.set(stored);
	fetchMe().then((u) => user.set(u)).catch(() => {
		token.set(null);
	});
}
//#endregion
//#region src/lib/stores/social.ts
var achievements = writable(null);
var profile = writable(null);
var profileLoading = writable(false);
var leaderboards = writable({});
var profileStats = derived(profile, ($p) => $p?.stats || null);
derived(profile, ($p) => $p?.recent_achievements || []);
async function loadAchievements() {
	achievements.set(null);
	try {
		const data = await fetchAchievements();
		achievements.set(data);
	} catch {}
}
async function loadProfile() {
	profileLoading.set(true);
	try {
		const data = await fetchProfile();
		profile.set(data);
	} catch {}
	profileLoading.set(false);
}
//#endregion
export { profileStats as a, currentSystemId as c, loadGalaxyData as d, selectedPlanet as f, systems as h, profile as i, games as l, showGame as m, loadAchievements as n, isAuthenticated as o, showAuth as p, loadProfile as r, user as s, leaderboards as t, hasPlayedGame as u };
