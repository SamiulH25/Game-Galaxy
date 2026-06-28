import { writable } from 'svelte/store';

export type NetworkQuality = 'good' | 'slow' | 'offline';

function readQuality(): NetworkQuality {
  if (typeof navigator === 'undefined') return 'good';
  if (!navigator.onLine) return 'offline';
  const conn = (navigator as Navigator & { connection?: { effectiveType?: string; saveData?: boolean } }).connection;
  if (conn?.saveData) return 'slow';
  const et = conn?.effectiveType;
  if (et === 'slow-2g' || et === '2g' || et === '3g') return 'slow';
  return 'good';
}

const { subscribe, set } = writable<NetworkQuality>(readQuality());

export const networkQuality = { subscribe };

export function refreshNetworkQuality() {
  set(readQuality());
}

export function dismissNetworkHint() {
  set('good');
}

export function initNetworkMonitor() {
  if (typeof window === 'undefined') return () => {};
  const update = () => refreshNetworkQuality();
  window.addEventListener('online', update);
  window.addEventListener('offline', update);
  const conn = (navigator as Navigator & { connection?: EventTarget }).connection;
  conn?.addEventListener?.('change', update);
  update();
  return () => {
    window.removeEventListener('online', update);
    window.removeEventListener('offline', update);
    conn?.removeEventListener?.('change', update);
  };
}
