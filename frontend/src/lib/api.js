/** @type {string | null} */
let _token = null;

/** @param {string | null} t */
export function setApiToken(t) {
  _token = t;
}

/** @returns {string | null} */
export function getApiToken() {
  return _token;
}

const REQUEST_TIMEOUT = 15_000; // 15 seconds

/**
 * @param {string} path
 * @param {RequestInit & {headers?: Record<string,string>}} [options]
 */
async function apiFetch(path, options = {}) {
  // AbortController for timeout — prevents hanging requests
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  const headers = { ...(options.headers || {}) };
  if (_token) {
    headers['Authorization'] = `Bearer ${_token}`;
  }
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const res = await fetch(path, { ...options, headers, signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `Request failed: ${res.status}`);
    }
    const ct = res.headers.get('content-type');
    if (ct && ct.includes('application/json')) {
      return res.json();
    }
    return res.text();
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Request timed out');
    }
    throw err;
  }
}

/** @param {string} username @param {string} password */
export function register(username, password) {
  return apiFetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

/** @param {string} username @param {string} password */
export function login(username, password) {
  return apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export function fetchMe() {
  return apiFetch('/api/auth/me');
}

// Games
export function fetchGames() {
  return apiFetch('/api/games');
}

/** @param {string} id */
export function fetchGame(id) {
  return apiFetch(`/api/games/${id}`);
}

export function fetchSystems() {
  return apiFetch('/api/games/systems');
}

// Saves
/** @param {string} gameId */
export function fetchSave(gameId) {
  return apiFetch(`/api/saves/${gameId}`);
}

/** @param {string} gameId @param {any} data */
export function saveGame(gameId, data) {
  return apiFetch(`/api/saves/${gameId}`, {
    method: 'PUT',
    body: JSON.stringify({ save_data: data }),
  });
}

// Social: Achievements
/** @param {string} gameId @param {string} achievementId */
export function unlockAchievement(gameId, achievementId) {
  return apiFetch(`/api/achievements/${gameId}/unlock`, {
    method: 'POST',
    body: JSON.stringify({ achievement_id: achievementId }),
  });
}

export function fetchAchievements() {
  return apiFetch('/api/achievements');
}

// Social: Leaderboards
/** @param {string} gameId @param {any} scoreData */
export function submitScore(gameId, scoreData) {
  return apiFetch(`/api/leaderboards/${gameId}/submit`, {
    method: 'POST',
    body: JSON.stringify({ score_data: scoreData }),
  });
}

/** @param {string} gameId @param {string} [view] @param {number} [limit] */
export function fetchLeaderboard(gameId, view = 'best', limit = 50) {
  return apiFetch(`/api/leaderboards/${gameId}?view=${view}&limit=${limit}`);
}

// Social: Profile
export function fetchProfile() {
  return apiFetch('/api/profile');
}
