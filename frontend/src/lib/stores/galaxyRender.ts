import { writable } from 'svelte/store';

export const galaxyRenderReady = writable(false);

export function enableGalaxyRender() {
  galaxyRenderReady.set(true);
}
