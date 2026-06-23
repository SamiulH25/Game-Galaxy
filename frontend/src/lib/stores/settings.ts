import { writable } from 'svelte/store';

export interface AppSettings {
  // Visual
  cameraRotSpeed: number;
  starDensity: 'low' | 'medium' | 'high';
  starBrightness: number;
  nebulaClouds: boolean;
  galaxySprites: boolean;
  planetGlow: boolean;
  orbitRings: boolean;

  // Audio
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;

  // UI
  showTutorialHints: boolean;
  autoSave: boolean;
  confirmCloseGame: boolean;
  uiScale: 'small' | 'normal' | 'large';

  // Advanced
  fpsDisplay: boolean;
  resetTutorial: boolean;
}

const STORAGE_KEY = 'gamegalaxy-settings';

const defaults: AppSettings = {
  cameraRotSpeed: 0.6,
  starDensity: 'medium',
  starBrightness: 1.0,
  nebulaClouds: true,
  galaxySprites: true,
  planetGlow: true,
  orbitRings: true,

  masterVolume: 80,
  sfxVolume: 80,
  musicVolume: 60,

  showTutorialHints: true,
  autoSave: true,
  confirmCloseGame: false,
  uiScale: 'normal',

  fpsDisplay: false,
  resetTutorial: false,
};

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...defaults, ...parsed };
    }
  } catch { /* ignore */ }
  return { ...defaults };
}

function saveSettings(settings: AppSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch { /* ignore */ }
}

export const settings = writable<AppSettings>(loadSettings());

// Persist on every change
settings.subscribe((val) => {
  saveSettings(val);
});

/** Reset all settings to defaults */
export function resetSettings() {
  settings.set({ ...defaults });
}
