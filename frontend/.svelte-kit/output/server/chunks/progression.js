import { i as writable, n as get, t as derived } from "./shared2.js";
import "./index-server2.js";
//#region src/lib/api.js
/** @type {string | null} */
var _token = null;
/** @param {string | null} t */
function setApiToken(t) {
	_token = t;
}
var REQUEST_TIMEOUT = 15e3;
/** @param {unknown} err */
function parseApiError(err) {
	if (!err) return "Something went wrong.";
	const msg = err instanceof Error ? err.message : String(err);
	if (msg === "Request timed out") return "Request timed out. Check your connection.";
	if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) return "Couldn't reach the server. Your local progress is safe.";
	try {
		const parsed = JSON.parse(msg);
		if (typeof parsed.detail === "string") return parsed.detail;
		if (Array.isArray(parsed.detail)) return parsed.detail.map((d) => typeof d === "string" ? d : d.msg || String(d)).join(", ");
	} catch {}
	return msg.length > 120 ? "Something went wrong." : msg;
}
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
/** Lightweight catalog version — used to detect new games on the server. */
function fetchGamesCatalog() {
	return apiFetch("/api/games/catalog");
}
function fetchAchievements() {
	return apiFetch("/api/achievements");
}
/** @param {string} gameId @param {string} [view] @param {number} [limit] */
function fetchLeaderboard(gameId, view = "best", limit = 50) {
	return apiFetch(`/api/leaderboards/${gameId}?view=${view}&limit=${limit}`);
}
function fetchProfile() {
	return apiFetch("/api/profile");
}
//#endregion
//#region src/lib/stores/toast.ts
var toasts = writable([]);
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
//#region src/lib/stores/galaxy.ts
var HAS_PLAYED_KEY = "gg_has_played";
var DISCOVERED_KEY = "gg_discovered";
var LAST_PLAYED_KEY = "gg_last_played";
var VISIT_DAYS_KEY = "gg_visit_days";
var KNOWN_GAMES_KEY = "gg_known_games";
function readHasPlayed() {
	if (typeof localStorage === "undefined") return false;
	return localStorage.getItem(HAS_PLAYED_KEY) === "1";
}
function writeHasPlayed(value) {
	if (typeof localStorage === "undefined") return;
	if (value) localStorage.setItem(HAS_PLAYED_KEY, "1");
	else localStorage.removeItem(HAS_PLAYED_KEY);
}
function readDiscovered() {
	if (typeof localStorage === "undefined") return /* @__PURE__ */ new Set();
	try {
		const raw = localStorage.getItem(DISCOVERED_KEY);
		if (!raw) return /* @__PURE__ */ new Set();
		return new Set(JSON.parse(raw));
	} catch {
		return /* @__PURE__ */ new Set();
	}
}
function writeDiscovered(ids) {
	if (typeof localStorage === "undefined") return;
	localStorage.setItem(DISCOVERED_KEY, JSON.stringify(ids));
}
function readLastPlayed() {
	if (typeof localStorage === "undefined") return null;
	try {
		const raw = localStorage.getItem(LAST_PLAYED_KEY);
		return raw ? JSON.parse(raw) : null;
	} catch {
		return null;
	}
}
function readVisitDays() {
	if (typeof localStorage === "undefined") return [];
	try {
		const raw = localStorage.getItem(VISIT_DAYS_KEY);
		return raw ? JSON.parse(raw) : [];
	} catch {
		return [];
	}
}
function writeVisitDays(days) {
	if (typeof localStorage === "undefined") return;
	localStorage.setItem(VISIT_DAYS_KEY, JSON.stringify(days.slice(-120)));
}
function readKnownGameIds() {
	if (typeof localStorage === "undefined") return /* @__PURE__ */ new Set();
	try {
		const raw = localStorage.getItem(KNOWN_GAMES_KEY);
		if (!raw) return /* @__PURE__ */ new Set();
		return new Set(JSON.parse(raw));
	} catch {
		return /* @__PURE__ */ new Set();
	}
}
function writeKnownGameIds(ids) {
	if (typeof localStorage === "undefined") return;
	localStorage.setItem(KNOWN_GAMES_KEY, JSON.stringify(ids));
}
function todayKey() {
	const d = /* @__PURE__ */ new Date();
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
var systems = writable([]);
var games = writable([]);
var currentSystemId = writable(null);
var selectedPlanet = writable(null);
var showAuth = writable(false);
var showGame = writable(null);
var hasPlayedGame = writable(readHasPlayed());
var discoveredGameIds = writable(readDiscovered());
var lastPlayedGame = writable(readLastPlayed());
writable(null);
var sessionSummary = writable(null);
var showOnboardingCoach = writable(false);
var galaxyHint = writable(null);
var focusPlanetId = writable(null);
var newGameIds = writable(/* @__PURE__ */ new Set());
var galaxyLoadState = writable("idle");
var loadPromise = null;
var catalogWatchId = null;
var galaxyLoadError = writable(null);
var focusTimer = null;
var newGameCount = derived(newGameIds, ($ids) => $ids.size);
derived([systems, currentSystemId], ([$systems, $id]) => $systems.find((s) => s.id === $id) || null);
derived([games, currentSystemId], ([$games, $id]) => $id ? $games.filter((g) => g.solarSystemId === $id) : $games);
var exploredCount = derived([discoveredGameIds, games], ([$discovered, $games]) => $discovered.size);
var totalGameCount = derived(games, ($games) => $games.length);
var currentSystemProgress = derived([
	discoveredGameIds,
	games,
	currentSystemId
], ([$discovered, $games, $systemId]) => {
	if (!$systemId) return {
		discovered: 0,
		total: 0
	};
	const inSystem = $games.filter((g) => g.solarSystemId === $systemId);
	return {
		discovered: inSystem.filter((g) => $discovered.has(g.id)).length,
		total: inSystem.length
	};
});
function recordDailyVisit() {
	if (!get(hasPlayedGame)) return;
	const days = readVisitDays();
	const today = todayKey();
	if (!days.includes(today)) {
		days.push(today);
		writeVisitDays(days);
	}
}
function markGamePlayed() {
	hasPlayedGame.set(true);
	import("./galaxyRender.js").then((m) => m.enableGalaxyRender());
	writeHasPlayed(true);
	recordDailyVisit();
}
function isGameDiscovered(gameId) {
	return get(discoveredGameIds).has(gameId);
}
async function loadGalaxyData() {
	if (loadPromise) return loadPromise;
	galaxyLoadState.set("loading");
	galaxyLoadError.set(null);
	loadPromise = (async () => {
		try {
			const [g, s] = await Promise.all([fetchGames(), fetchSystems()]);
			games.set(g);
			systems.set(s);
			seedStarterDiscoveriesIfNeeded();
			detectNewGames(g);
			if (s.length > 0 && !get(currentSystemId)) currentSystemId.set(s[0].id);
			applyGalaxyDeepLink();
			galaxyLoadState.set("ready");
			try {
				(await fetchGamesCatalog()).generation;
			} catch {}
		} catch (err) {
			galaxyLoadState.set("error");
			galaxyLoadError.set(parseApiError(err));
			throw err;
		} finally {
			loadPromise = null;
		}
	})();
	return loadPromise;
}
function stopGalaxyCatalogWatch() {
	if (catalogWatchId) {
		clearInterval(catalogWatchId);
		catalogWatchId = null;
	}
}
/** Lightweight progression from discovery count — no backend required. */
function getExplorerRank(explored, total, played) {
	if (!played) return {
		title: "Visitor",
		tier: 0
	};
	if (total === 0) return {
		title: "Cadet",
		tier: 1
	};
	if (explored === 0) return {
		title: "Cadet",
		tier: 1,
		nextTitle: "Scout",
		remaining: 1
	};
	if (explored >= total) return {
		title: "Galaxy Master",
		tier: 6
	};
	const pct = explored / total;
	const steps = [
		{
			title: "Scout",
			tier: 2,
			next: "Navigator",
			at: .25
		},
		{
			title: "Navigator",
			tier: 3,
			next: "Veteran",
			at: .5
		},
		{
			title: "Veteran",
			tier: 4,
			next: "Commander",
			at: .75
		},
		{
			title: "Commander",
			tier: 5,
			next: "Galaxy Master",
			at: 1
		}
	];
	if (pct < .25) return {
		title: "Scout",
		tier: 2,
		nextTitle: "Navigator",
		remaining: Math.max(1, Math.ceil(total * .25)) - explored
	};
	for (const s of steps) if (pct < s.at) {
		const need = Math.ceil(total * s.at);
		return {
			title: s.title,
			tier: s.tier,
			nextTitle: s.next,
			remaining: need - explored
		};
	}
	return {
		title: "Commander",
		tier: 5,
		nextTitle: "Galaxy Master",
		remaining: total - explored
	};
}
/** Deterministic daily highlight — same planet for everyone each UTC day. */
function getDailyPlanet(gameList) {
	if (!gameList.length) return null;
	const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
	let hash = 0;
	for (let i = 0; i < today.length; i++) {
		hash = (hash << 5) - hash + today.charCodeAt(i);
		hash |= 0;
	}
	return gameList[Math.abs(hash) % gameList.length];
}
/** Returning visitors: flag games added since last catalog snapshot. */
function detectNewGames(gameList) {
	const known = readKnownGameIds();
	const currentIds = gameList.map((g) => g.id);
	if (known.size === 0) {
		writeKnownGameIds(currentIds);
		newGameIds.set(/* @__PURE__ */ new Set());
		return;
	}
	const fresh = new Set(currentIds.filter((id) => !known.has(id)));
	newGameIds.set(fresh);
}
/** Open popup from ?planet= & ?challenge= deep links. */
function applyGalaxyDeepLink() {
	if (typeof window === "undefined") return false;
	const params = new URLSearchParams(window.location.search);
	const planetId = params.get("planet");
	if (!planetId) return false;
	const game = get(games).find((g) => g.id === planetId);
	if (!game) return false;
	const challengeRaw = params.get("challenge");
	const challenge = challengeRaw ? parseInt(challengeRaw, 10) : null;
	if (game.solarSystemId) currentSystemId.set(game.solarSystemId);
	markGamePlayed();
	focusPlanetInGalaxy(game);
	const payload = {
		...game,
		__fromShare: true
	};
	if (challenge != null && !Number.isNaN(challenge)) payload.__shareChallenge = challenge;
	selectedPlanet.set(payload);
	window.history.replaceState({}, "", window.location.pathname);
	return true;
}
function focusPlanetInGalaxy(game) {
	if (!game?.id) return;
	if (game.solarSystemId) currentSystemId.set(game.solarSystemId);
	focusPlanetId.set(game.id);
	if (focusTimer) clearTimeout(focusTimer);
	focusTimer = setTimeout(() => focusPlanetId.set(null), 8e3);
}
function getStarterGameIds(gameList) {
	const flagged = gameList.filter((g) => g.starter === true || g.tags?.includes("starter"));
	if (flagged.length > 0) return flagged.map((g) => g.id);
	return [...gameList].sort((a, b) => (a.orbitRadius ?? 99) - (b.orbitRadius ?? 99)).slice(0, 2).map((g) => g.id);
}
/** First-time visitors get starter worlds; also reconcile last-played into discovered. */
function seedStarterDiscoveriesIfNeeded() {
	const gameList = get(games);
	discoveredGameIds.update((set) => {
		const next = new Set(set);
		let changed = false;
		if (next.size === 0 && gameList.length > 0) {
			for (const id of getStarterGameIds(gameList)) if (!next.has(id)) {
				next.add(id);
				changed = true;
			}
		}
		const last = readLastPlayed();
		if (last?.id && !next.has(last.id)) {
			next.add(last.id);
			changed = true;
		}
		if (!changed) return set;
		writeDiscovered([...next]);
		return next;
	});
}
//#endregion
//#region src/lib/stores/progression.ts
var PENDING_GUEST_KEY = "gg_pending_guest";
var DAILY_DONE_KEY = "gg_daily_mission_done";
var showUnchartedOnly = writable(false);
var pageTitle = writable("Game Galaxy");
var galaxySceneApi = writable(null);
function getTodayKey() {
	return (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
}
function computeDailyTarget(gameId, date) {
	let hash = 0;
	const seed = date + gameId;
	for (let i = 0; i < seed.length; i++) {
		hash = (hash << 5) - hash + seed.charCodeAt(i);
		hash |= 0;
	}
	const base = 500 + Math.abs(hash) % 4500;
	return Math.round(base / 50) * 50;
}
function getDailyMission() {
	const game = getDailyPlanet(get(games));
	if (!game) return null;
	const date = getTodayKey();
	return {
		gameId: game.id,
		game,
		targetScore: computeDailyTarget(game.id, date),
		date
	};
}
function isDailyMissionForGame(gameId) {
	return getDailyMission()?.gameId === gameId;
}
function isDailyMissionComplete() {
	if (typeof localStorage === "undefined") return false;
	try {
		const raw = localStorage.getItem(DAILY_DONE_KEY);
		if (!raw) return false;
		return JSON.parse(raw).date === getTodayKey();
	} catch {
		return false;
	}
}
function markDailyMissionComplete() {
	if (typeof localStorage === "undefined") return;
	localStorage.setItem(DAILY_DONE_KEY, JSON.stringify({ date: getTodayKey() }));
}
function readPendingGuest() {
	if (typeof localStorage === "undefined") return null;
	try {
		const raw = localStorage.getItem(PENDING_GUEST_KEY);
		return raw ? JSON.parse(raw) : null;
	} catch {
		return null;
	}
}
function setPendingGuest(session) {
	if (typeof localStorage === "undefined") return;
	if (session) localStorage.setItem(PENDING_GUEST_KEY, JSON.stringify(session));
	else localStorage.removeItem(PENDING_GUEST_KEY);
}
function queuePendingGuest(payload) {
	if (!payload.gameId) return;
	const existing = readPendingGuest();
	setPendingGuest({
		gameId: payload.gameId,
		gameTitle: payload.gameTitle,
		score: payload.score ?? existing?.score ?? null,
		scoreData: payload.scoreData ?? existing?.scoreData ?? null,
		achievements: [...existing?.achievements ?? [], ...payload.achievements ?? []],
		at: Date.now()
	});
}
function evaluateDailyMission(score) {
	if (score === null) return null;
	const mission = getDailyMission();
	if (!mission) return null;
	return score >= mission.targetScore;
}
function evaluateChallenge(score, target) {
	if (score === null || target === null) return null;
	return score >= target;
}
function getSeasonInfo() {
	const now = /* @__PURE__ */ new Date();
	const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
	return {
		name: "Nebula Drift",
		daysLeft: Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 864e5)),
		active: true,
		themeClass: "season-nebula"
	};
}
//#endregion
export { sessionSummary as A, fetchAchievements as B, hasPlayedGame as C, markGamePlayed as D, loadGalaxyData as E, systems as F, fetchProfile as H, totalGameCount as I, isAuthenticated as L, showGame as M, showOnboardingCoach as N, newGameCount as O, stopGalaxyCatalogWatch as P, user as R, getExplorerRank as S, lastPlayedGame as T, fetchLeaderboard as V, galaxyHint as _, getSeasonInfo as a, games as b, markDailyMissionComplete as c, readPendingGuest as d, showUnchartedOnly as f, exploredCount as g, discoveredGameIds as h, getDailyMission as i, showAuth as j, recordDailyVisit as k, pageTitle as l, currentSystemProgress as m, evaluateDailyMission as n, isDailyMissionComplete as o, currentSystemId as p, galaxySceneApi as r, isDailyMissionForGame as s, evaluateChallenge as t, queuePendingGuest as u, galaxyLoadError as v, isGameDiscovered as w, getDailyPlanet as x, galaxyLoadState as y, toasts as z };
