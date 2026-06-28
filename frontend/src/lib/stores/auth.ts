import { writable, derived } from 'svelte/store';
import { setApiToken } from '$lib/api';
import { fetchMe, login as apiLogin, register as apiRegister } from '$lib/api';
import { flushPendingGuestOnLogin } from '$lib/stores/progression';
import { showToast } from '$lib/stores/toast';

function getStoredToken(): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem('gg_token');
}

export const token = writable<string | null>(getStoredToken());
export const user = writable<Record<string, any> | null>(null);
export const isAuthenticated = derived(token, $t => $t !== null);

// Sync token to localStorage and API module
token.subscribe(val => {
  setApiToken(val);
  if (typeof localStorage !== 'undefined') {
    if (val) localStorage.setItem('gg_token', val);
    else localStorage.removeItem('gg_token');
  }
});

export async function loginUser(username: string, password: string) {
  const data = await apiLogin(username, password);
  token.set(data.access_token);
  const me = await fetchMe();
  user.set(me);
  const syncMsg = await flushPendingGuestOnLogin();
  if (syncMsg) showToast(syncMsg, 'success', 4000);
  return me;
}

export async function registerUser(username: string, password: string) {
  await apiRegister(username, password);
  return loginUser(username, password);
}

export function logoutUser() {
  token.set(null);
  user.set(null);
}

// Auto-restore session on load
const stored = getStoredToken();
if (stored) {
  token.set(stored);
  fetchMe().then(u => user.set(u)).catch(() => {
    token.set(null);
  });
}
