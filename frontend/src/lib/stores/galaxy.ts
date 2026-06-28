import { writable, derived, get } from 'svelte/store';
import { fetchGames, fetchSystems, fetchGamesCatalog, parseApiError } from '$lib/api';
import { isAuthenticated } from '$lib/stores/auth';

const HAS_PLAYED_KEY = 'gg_has_played';
const DISCOVERED_KEY = 'gg_discovered';
const LAST_PLAYED_KEY = 'gg_last_played';
const VISIT_DAYS_KEY = 'gg_visit_days';
const KNOWN_GAMES_KEY = 'gg_known_games';

function readHasPlayed(): boolean {
  if (typeof localStorage === 'undefined') return false;
  return localStorage.getItem(HAS_PLAYED_KEY) === '1';
}

function writeHasPlayed(value: boolean) {
  if (typeof localStorage === 'undefined') return;
  if (value) localStorage.setItem(HAS_PLAYED_KEY, '1');
  else localStorage.removeItem(HAS_PLAYED_KEY);
}

function readDiscovered(): Set<string> {
  if (typeof localStorage === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(DISCOVERED_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function writeDiscovered(ids: string[]) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(DISCOVERED_KEY, JSON.stringify(ids));
}

function readLastPlayed(): LastPlayedGame | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LAST_PLAYED_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeLastPlayed(entry: LastPlayedGame | null) {
  if (typeof localStorage === 'undefined') return;
  if (entry) localStorage.setItem(LAST_PLAYED_KEY, JSON.stringify(entry));
  else localStorage.removeItem(LAST_PLAYED_KEY);
}

function readVisitDays(): string[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(VISIT_DAYS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeVisitDays(days: string[]) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(VISIT_DAYS_KEY, JSON.stringify(days.slice(-120)));
}

function readKnownGameIds(): Set<string> {
  if (typeof localStorage === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(KNOWN_GAMES_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function writeKnownGameIds(ids: string[]) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(KNOWN_GAMES_KEY, JSON.stringify(ids));
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function yesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export type LastPlayedGame = {
  id: string;
  title: string;
  planetName?: string;
  solarSystemId: string;
  solarSystemName?: string;
  planetColor?: string;
  playedAt: number;
};

export type SessionAchievement = { title: string; icon: string; id?: string };

export type SessionSummary = {
  game: any;
  score: number | null;
  scoreLabel?: string;
  achievements: SessionAchievement[];
  durationMs: number;
  rank: number | null;
  isPersonalBest: boolean;
  won: boolean | null;
  rankDelta?: number | null;
  previousRank?: number | null;
  dailyMissionBeat?: boolean | null;
  dailyMissionTarget?: number | null;
  challengeBeat?: boolean | null;
  challengeTarget?: number | null;
  hadPendingGuest?: boolean;
};

export const systems = writable<any[]>([]);
export const games = writable<any[]>([]);
export const currentSystemId = writable<string | null>(null);
export const selectedPlanet = writable<any>(null);
export const showAuth = writable<boolean>(false);
export const showGame = writable<any>(null);
export const hasPlayedGame = writable<boolean>(readHasPlayed());
export const discoveredGameIds = writable<Set<string>>(readDiscovered());
export const lastPlayedGame = writable<LastPlayedGame | null>(readLastPlayed());
export const animateRevealGameId = writable<string | null>(null);
export const sessionSummary = writable<SessionSummary | null>(null);
export const showOnboardingCoach = writable<boolean>(false);
export const galaxyHint = writable<string | null>(null);
export const focusPlanetId = writable<string | null>(null);
export const newGameIds = writable<Set<string>>(new Set());

export type GalaxyLoadState = 'idle' | 'loading' | 'ready' | 'error';
export const galaxyLoadState = writable<GalaxyLoadState>('idle');
let loadPromise: Promise<void> | null = null;
let catalogGeneration: number | null = null;
let catalogWatchId: ReturnType<typeof setInterval> | null = null;
export const galaxyLoadError = writable<string | null>(null);

let hintTimer: ReturnType<typeof setTimeout> | null = null;
let focusTimer: ReturnType<typeof setTimeout> | null = null;

export const newGameCount = derived(newGameIds, ($ids) => $ids.size);

export const currentSystem = derived(
  [systems, currentSystemId],
  ([$systems, $id]) => $systems.find(s => s.id === $id) || null
);

export const filteredGames = derived(
  [games, currentSystemId],
  ([$games, $id]) => $id ? $games.filter(g => g.solarSystemId === $id) : $games
);

export const exploredCount = derived(
  [discoveredGameIds, games],
  ([$discovered, $games]) => $discovered.size
);

export const totalGameCount = derived(games, ($games) => $games.length);

export const currentSystemProgress = derived(
  [discoveredGameIds, games, currentSystemId],
  ([$discovered, $games, $systemId]) => {
    if (!$systemId) return { discovered: 0, total: 0 };
    const inSystem = $games.filter((g) => g.solarSystemId === $systemId);
    const discovered = inSystem.filter((g) => $discovered.has(g.id)).length;
    return { discovered, total: inSystem.length };
  }
);

export function getVisitStreak(): number {
  const days = new Set(readVisitDays());
  if (days.size === 0) return 0;

  const today = todayKey();
  const yesterday = yesterdayKey();
  let cursor = days.has(today) ? today : days.has(yesterday) ? yesterday : null;
  if (!cursor) return 0;

  let streak = 0;
  const d = new Date(cursor);
  while (true) {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (!days.has(key)) break;
    streak += 1;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export function recordDailyVisit() {
  if (!get(hasPlayedGame)) return;
  const days = readVisitDays();
  const today = todayKey();
  if (!days.includes(today)) {
    days.push(today);
    writeVisitDays(days);
  }
}

export function markGamePlayed() {
  hasPlayedGame.set(true);
  import('$lib/stores/galaxyRender').then((m) => m.enableGalaxyRender());
  writeHasPlayed(true);
  recordDailyVisit();
}

export function isGameDiscovered(gameId: string): boolean {
  return get(discoveredGameIds).has(gameId);
}

export function markGameDiscovered(gameId: string): boolean {
  let wasNew = false;
  discoveredGameIds.update((set) => {
    if (set.has(gameId)) return set;
    wasNew = true;
    const next = new Set(set);
    next.add(gameId);
    writeDiscovered([...next]);
    animateRevealGameId.set(gameId);
    return next;
  });
  if (wasNew) {
    import('$lib/utils/haptics').then((m) => m.hapticDiscovery());
    import('$lib/stores/progression').then((m) => m.checkProgressionCelebrations());
  }
  return wasNew;
}

export function recordLastPlayed(game: any) {
  if (!game?.id) return;
  const entry: LastPlayedGame = {
    id: game.id,
    title: game.title,
    planetName: game.planetName,
    solarSystemId: game.solarSystemId,
    solarSystemName: game.solarSystemName,
    planetColor: game.planetColor,
    playedAt: Date.now(),
  };
  lastPlayedGame.set(entry);
  writeLastPlayed(entry);
}

export function dismissOnboarding() {
  showOnboardingCoach.set(false);
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('gg_onboarding_done', '1');
  }
}

export function maybeShowOnboarding() {
  if (typeof localStorage === 'undefined') return;
  if (localStorage.getItem('gg_onboarding_done') === '1') return;
  showOnboardingCoach.set(true);
}

export async function loadGalaxyData() {
  if (loadPromise) return loadPromise;
  galaxyLoadState.set('loading');
  galaxyLoadError.set(null);
  loadPromise = (async () => {
    try {
      const [g, s] = await Promise.all([fetchGames(), fetchSystems()]);
      games.set(g);
      systems.set(s);
      seedStarterDiscoveriesIfNeeded();
      detectNewGames(g);
      if (s.length > 0 && !get(currentSystemId)) {
        currentSystemId.set(s[0].id);
      }
      applyGalaxyDeepLink();
      galaxyLoadState.set('ready');
      try {
        const cat = await fetchGamesCatalog();
        catalogGeneration = cat.generation ?? null;
      } catch {
        /* catalog poll is best-effort */
      }
    } catch (err) {
      galaxyLoadState.set('error');
      galaxyLoadError.set(parseApiError(err));
      throw err;
    } finally {
      loadPromise = null;
    }
  })();
  return loadPromise;
}

export function retryLoadGalaxyData() {
  return loadGalaxyData();
}

/** Poll server catalog so new games appear without a full page reload (server-side dev). */
export function startGalaxyCatalogWatch(intervalMs = 15000) {
  if (typeof window === 'undefined' || catalogWatchId) return;
  catalogWatchId = setInterval(async () => {
    try {
      const cat = await fetchGamesCatalog();
      const gen = cat.generation ?? null;
      if (catalogGeneration !== null && gen !== null && gen !== catalogGeneration) {
        loadPromise = null;
        await loadGalaxyData();
      } else if (catalogGeneration === null && gen !== null) {
        catalogGeneration = gen;
      }
    } catch {
      /* ignore transient network errors */
    }
  }, intervalMs);
}

export function stopGalaxyCatalogWatch() {
  if (catalogWatchId) {
    clearInterval(catalogWatchId);
    catalogWatchId = null;
  }
}

export interface ExplorerRank {
  title: string;
  tier: number;
  nextTitle?: string;
  remaining?: number;
}

/** Lightweight progression from discovery count — no backend required. */
export function getExplorerRank(explored: number, total: number, played: boolean): ExplorerRank {
  if (!played) return { title: 'Visitor', tier: 0 };
  if (total === 0) return { title: 'Cadet', tier: 1 };
  if (explored === 0) return { title: 'Cadet', tier: 1, nextTitle: 'Scout', remaining: 1 };
  if (explored >= total) return { title: 'Galaxy Master', tier: 6 };

  const pct = explored / total;
  const steps = [
    { title: 'Scout', tier: 2, next: 'Navigator', at: 0.25 },
    { title: 'Navigator', tier: 3, next: 'Veteran', at: 0.5 },
    { title: 'Veteran', tier: 4, next: 'Commander', at: 0.75 },
    { title: 'Commander', tier: 5, next: 'Galaxy Master', at: 1 },
  ];

  if (pct < 0.25) {
    const need = Math.max(1, Math.ceil(total * 0.25));
    return { title: 'Scout', tier: 2, nextTitle: 'Navigator', remaining: need - explored };
  }
  for (const s of steps) {
    if (pct < s.at) {
      const need = Math.ceil(total * s.at);
      return { title: s.title, tier: s.tier, nextTitle: s.next, remaining: need - explored };
    }
  }
  return { title: 'Commander', tier: 5, nextTitle: 'Galaxy Master', remaining: total - explored };
}

/** Deterministic daily highlight — same planet for everyone each UTC day. */
export function getDailyPlanet(gameList: any[]): any | null {
  if (!gameList.length) return null;
  const today = new Date().toISOString().slice(0, 10);
  let hash = 0;
  for (let i = 0; i < today.length; i++) {
    hash = (hash << 5) - hash + today.charCodeAt(i);
    hash |= 0;
  }
  return gameList[Math.abs(hash) % gameList.length];
}

export function focusDailyPlanet() {
  const mission = getDailyMissionFromStore();
  const game = mission?.game ?? getDailyPlanet(get(games));
  if (!game) return false;
  if (game.solarSystemId) currentSystemId.set(game.solarSystemId);
  focusPlanetInGalaxy(game);
  const payload: Record<string, unknown> = { ...game, __dailyPick: true };
  if (mission) payload.__dailyMission = mission.targetScore;
  selectedPlanet.set(payload);
  return true;
}

function getDailyMissionFromStore(): { game: any; targetScore: number } | null {
  try {
    // Lazy import avoided — duplicate minimal logic
    const gameList = get(games);
    const planet = getDailyPlanet(gameList);
    if (!planet) return null;
    const date = new Date().toISOString().slice(0, 10);
    let hash = 0;
    const seed = date + planet.id;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }
    const targetScore = Math.round((500 + (Math.abs(hash) % 4500)) / 50) * 50;
    return { game: planet, targetScore };
  } catch {
    return null;
  }
}

/** Returning visitors: flag games added since last catalog snapshot. */
export function detectNewGames(gameList: any[]) {
  const known = readKnownGameIds();
  const currentIds = gameList.map((g) => g.id);
  if (known.size === 0) {
    writeKnownGameIds(currentIds);
    newGameIds.set(new Set());
    return;
  }
  const fresh = new Set(currentIds.filter((id) => !known.has(id)));
  newGameIds.set(fresh);
}

export function acknowledgeNewGames() {
  const gameList = get(games);
  if (gameList.length === 0) return;
  writeKnownGameIds(gameList.map((g) => g.id));
  newGameIds.set(new Set());
}

export function buildShareUrl(gameId: string, challenge?: number | null): string {
  if (typeof window === 'undefined') return `/?planet=${gameId}`;
  const url = new URL(window.location.origin + window.location.pathname);
  url.searchParams.set('planet', gameId);
  if (challenge != null && !Number.isNaN(challenge)) {
    url.searchParams.set('challenge', String(Math.round(challenge)));
  }
  return url.toString();
}

/** Open popup from ?planet= & ?challenge= deep links. */
export function applyGalaxyDeepLink(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  const planetId = params.get('planet');
  if (!planetId) return false;

  const gameList = get(games);
  const game = gameList.find((g) => g.id === planetId);
  if (!game) return false;

  const challengeRaw = params.get('challenge');
  const challenge = challengeRaw ? parseInt(challengeRaw, 10) : null;

  if (game.solarSystemId) currentSystemId.set(game.solarSystemId);
  markGamePlayed();
  focusPlanetInGalaxy(game);

  const payload: Record<string, unknown> = { ...game, __fromShare: true };
  if (challenge != null && !Number.isNaN(challenge)) {
    payload.__shareChallenge = challenge;
  }
  selectedPlanet.set(payload);

  window.history.replaceState({}, '', window.location.pathname);
  return true;
}

export function focusPlanetInGalaxy(game: any) {
  if (!game?.id) return;
  if (game.solarSystemId) currentSystemId.set(game.solarSystemId);
  focusPlanetId.set(game.id);
  if (focusTimer) clearTimeout(focusTimer);
  focusTimer = setTimeout(() => focusPlanetId.set(null), 8000);
}

function getStarterGameIds(gameList: any[]): string[] {
  const flagged = gameList.filter(
    (g) => g.starter === true || g.tags?.includes('starter')
  );
  if (flagged.length > 0) return flagged.map((g) => g.id);
  const sorted = [...gameList].sort(
    (a, b) => (a.orbitRadius ?? 99) - (b.orbitRadius ?? 99)
  );
  return sorted.slice(0, 2).map((g) => g.id);
}

/** First-time visitors get starter worlds; also reconcile last-played into discovered. */
export function seedStarterDiscoveriesIfNeeded() {
  const gameList = get(games);
  discoveredGameIds.update((set) => {
    const next = new Set(set);
    let changed = false;
    if (next.size === 0 && gameList.length > 0) {
      for (const id of getStarterGameIds(gameList)) {
        if (!next.has(id)) {
          next.add(id);
          changed = true;
        }
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

export function nudgeGalaxyDiscovery(game: any) {
  focusPlanetInGalaxy(game);
  const label = game?.planetName || game?.title || 'this world';
  galaxyHint.set(`Click ${label} in the galaxy to discover it`);
  if (hintTimer) clearTimeout(hintTimer);
  hintTimer = setTimeout(() => galaxyHint.set(null), 5500);
}

export function launchDiscoveredGame(game: any): boolean {
  if (!get(isAuthenticated)) {
    showAuth.set(true);
    return false;
  }
  if (!game?.id || !isGameDiscovered(game.id)) {
    nudgeGalaxyDiscovery(game);
    return false;
  }
  markGamePlayed();
  recordLastPlayed(game);
  showGame.set({ ...game });
  return true;
}

export function cycleSystem(direction: 1 | -1) {
  const list = get(systems);
  if (list.length < 2) return;
  const idx = list.findIndex((s) => s.id === get(currentSystemId));
  const base = idx >= 0 ? idx : 0;
  const next = list[(base + direction + list.length) % list.length];
  currentSystemId.set(next.id);
}
