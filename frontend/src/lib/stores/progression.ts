import { writable, get } from 'svelte/store';
import {
  getDailyPlanet,
  getExplorerRank,
  games,
  systems,
  discoveredGameIds,
  totalGameCount,
  hasPlayedGame,
  type SessionAchievement,
} from '$lib/stores/galaxy';
import { submitScore, unlockAchievement } from '$lib/api';
import { showToast } from '$lib/stores/toast';

const PENDING_GUEST_KEY = 'gg_pending_guest';
const LAST_TIER_KEY = 'gg_last_rank_tier';
const CHARTED_KEY = 'gg_charted_systems';
const CHALLENGE_HIST_KEY = 'gg_challenge_history';
const PERSONAL_BESTS_KEY = 'gg_personal_bests';
const DAILY_DONE_KEY = 'gg_daily_mission_done';

export type PendingGuestSession = {
  gameId: string;
  gameTitle?: string;
  score: number | null;
  scoreData: Record<string, unknown> | null;
  achievements: SessionAchievement[];
  at: number;
};

export type DailyMission = {
  gameId: string;
  game: Record<string, unknown>;
  targetScore: number;
  date: string;
};

export type ChallengeRecord = {
  gameId: string;
  gameTitle?: string;
  challengerScore: number;
  yourScore: number;
  won: boolean;
  at: number;
};

export const showUnchartedOnly = writable(false);
export const pageTitle = writable('Game Galaxy');
export const galaxySceneApi = writable<{ recenter: () => void } | null>(null);

export function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function computeDailyTarget(gameId: string, date: string): number {
  let hash = 0;
  const seed = date + gameId;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const base = 500 + (Math.abs(hash) % 4500);
  return Math.round(base / 50) * 50;
}

export function getDailyMission(): DailyMission | null {
  const gameList = get(games);
  const game = getDailyPlanet(gameList);
  if (!game) return null;
  const date = getTodayKey();
  return {
    gameId: game.id,
    game,
    targetScore: computeDailyTarget(game.id, date),
    date,
  };
}

export function isDailyMissionForGame(gameId: string): boolean {
  const mission = getDailyMission();
  return mission?.gameId === gameId;
}

export function isDailyMissionComplete(): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    const raw = localStorage.getItem(DAILY_DONE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { date: string };
    return parsed.date === getTodayKey();
  } catch {
    return false;
  }
}

export function markDailyMissionComplete() {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(DAILY_DONE_KEY, JSON.stringify({ date: getTodayKey() }));
}

function readPersonalBests(): Record<string, number> {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(PERSONAL_BESTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function recordPersonalBest(gameId: string, score: number) {
  if (typeof localStorage === 'undefined' || !gameId) return;
  const bests = readPersonalBests();
  if (bests[gameId] == null || score > bests[gameId]) {
    bests[gameId] = score;
    localStorage.setItem(PERSONAL_BESTS_KEY, JSON.stringify(bests));
  }
}

export function getPersonalBest(gameId: string): number | null {
  const v = readPersonalBests()[gameId];
  return typeof v === 'number' ? v : null;
}

export function readPendingGuest(): PendingGuestSession | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PENDING_GUEST_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setPendingGuest(session: PendingGuestSession | null) {
  if (typeof localStorage === 'undefined') return;
  if (session) {
    localStorage.setItem(PENDING_GUEST_KEY, JSON.stringify(session));
  } else {
    localStorage.removeItem(PENDING_GUEST_KEY);
  }
}

export function queuePendingGuest(payload: {
  gameId: string;
  gameTitle?: string;
  score: number | null;
  scoreData?: Record<string, unknown> | null;
  achievements?: SessionAchievement[];
}) {
  if (!payload.gameId) return;
  const existing = readPendingGuest();
  const merged: PendingGuestSession = {
    gameId: payload.gameId,
    gameTitle: payload.gameTitle,
    score: payload.score ?? existing?.score ?? null,
    scoreData: payload.scoreData ?? existing?.scoreData ?? null,
    achievements: [...(existing?.achievements ?? []), ...(payload.achievements ?? [])],
    at: Date.now(),
  };
  setPendingGuest(merged);
}

export async function flushPendingGuestOnLogin(): Promise<string | null> {
  const pending = readPendingGuest();
  if (!pending) return null;
  const parts: string[] = [];
  try {
    if (pending.scoreData) {
      await submitScore(pending.gameId, pending.scoreData);
      parts.push('score synced');
    }
    if (typeof pending.score === 'number') {
      recordPersonalBest(pending.gameId, pending.score);
    }
    const seen = new Set<string>();
    for (const ach of pending.achievements) {
      if (!ach.id || seen.has(ach.id)) continue;
      seen.add(ach.id);
      try {
        await unlockAchievement(pending.gameId, ach.id);
      } catch {
        /* may already exist */
      }
    }
    if (pending.achievements.length > 0) parts.push('achievements saved');
  } catch {
    return null;
  }
  setPendingGuest(null);
  if (parts.length === 0) return 'Welcome back — progress synced';
  return `Welcome back — ${parts.join(', ')}`;
}

function readLastTier(): number | null {
  if (typeof localStorage === 'undefined') return null;
  const raw = localStorage.getItem(LAST_TIER_KEY);
  return raw != null ? parseInt(raw, 10) : null;
}

function writeLastTier(tier: number) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(LAST_TIER_KEY, String(tier));
}

function readChartedSystems(): Set<string> {
  if (typeof localStorage === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(CHARTED_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function writeChartedSystems(ids: string[]) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(CHARTED_KEY, JSON.stringify(ids));
}

/** Call when discovery count or rank may have changed. */
export function checkProgressionCelebrations() {
  if (!get(hasPlayedGame)) return;

  const explored = get(discoveredGameIds).size;
  const total = get(totalGameCount);
  const rank = getExplorerRank(explored, total, true);
  const lastTier = readLastTier();

  if (lastTier !== null && rank.tier > lastTier) {
    showToast(`Rank up — ${rank.title}`, 'success', 4500);
    import('$lib/utils/haptics').then((m) => m.hapticSuccess());
  }
  writeLastTier(rank.tier);

  const charted = readChartedSystems();
  const gameList = get(games);
  const systemList = get(systems);

  for (const sys of systemList) {
    if (charted.has(sys.id)) continue;
    const inSystem = gameList.filter((g) => g.solarSystemId === sys.id);
    if (inSystem.length === 0) continue;
    const allFound = inSystem.every((g) => get(discoveredGameIds).has(g.id));
    if (allFound) {
      charted.add(sys.id);
      writeChartedSystems([...charted]);
      showToast(`System charted — ${sys.name}`, 'success', 4500);
      import('$lib/utils/haptics').then((m) => m.hapticSuccess());
    }
  }
}

export function readChallengeHistory(): ChallengeRecord[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CHALLENGE_HIST_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function recordChallengeResult(entry: ChallengeRecord) {
  if (typeof localStorage === 'undefined') return;
  const hist = readChallengeHistory();
  hist.unshift(entry);
  localStorage.setItem(CHALLENGE_HIST_KEY, JSON.stringify(hist.slice(0, 20)));
}

export function evaluateDailyMission(score: number | null): boolean | null {
  if (score === null) return null;
  const mission = getDailyMission();
  if (!mission) return null;
  return score >= mission.targetScore;
}

export function evaluateChallenge(score: number | null, target: number | null): boolean | null {
  if (score === null || target === null) return null;
  return score >= target;
}

export interface SeasonInfo {
  name: string;
  daysLeft: number;
  active: boolean;
  themeClass: string;
}

export function getSeasonInfo(): SeasonInfo {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const daysLeft = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86400000));
  return {
    name: 'Nebula Drift',
    daysLeft,
    active: true,
    themeClass: 'season-nebula',
  };
}

export function replayOnboarding() {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem('gg_onboarding_done');
}
