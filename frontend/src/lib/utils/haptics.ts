import { get } from 'svelte/store';
import { settings } from '$lib/stores/settings';
import { isCoarse } from '$lib/stores/viewport';

function canVibrate(): boolean {
  if (typeof navigator === 'undefined' || !navigator.vibrate) return false;
  if (!get(settings).hapticsEnabled) return false;
  return get(isCoarse);
}

export function hapticLight() {
  if (!canVibrate()) return;
  navigator.vibrate(12);
}

export function hapticMedium() {
  if (!canVibrate()) return;
  navigator.vibrate(28);
}

export function hapticSuccess() {
  if (!canVibrate()) return;
  navigator.vibrate([20, 40, 25]);
}

export function hapticDiscovery() {
  hapticSuccess();
}
