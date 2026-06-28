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
  reduceMotion: boolean;
  highContrast: boolean;
  hapticsEnabled: boolean;
  doubleTapLaunch: boolean;
  mobileAutoFullscreen: boolean;

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
  reduceMotion: false,
  highContrast: false,
  hapticsEnabled: true,
  doubleTapLaunch: false,
  mobileAutoFullscreen: false,

  fpsDisplay: false,
  resetTutorial: false,
};

function systemPrefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= 640 || window.matchMedia('(pointer: coarse)').matches;
}

function prefersReducedData(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-data: reduce)').matches;
}

function applyEnvironmentDefaults(result: AppSettings, parsed: Record<string, unknown>): AppSettings {
  if (!('reduceMotion' in parsed) && systemPrefersReducedMotion()) {
    result.reduceMotion = true;
  }
  if (!('mobileDefaultsApplied' in parsed) && isMobileDevice()) {
    result.starDensity = 'low';
    result.galaxySprites = false;
    if (!('nebulaClouds' in parsed)) {
      result.nebulaClouds = !prefersReducedData();
    }
    (result as AppSettings & { mobileDefaultsApplied?: boolean }).mobileDefaultsApplied = true;
  }
  if (!('nebulaClouds' in parsed) && prefersReducedData()) {
    result.nebulaClouds = false;
    result.galaxySprites = false;
  }
  return result;
}

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const result = applyEnvironmentDefaults({ ...defaults, ...parsed }, parsed);
      return result;
    }
  } catch { /* ignore */ }
  if (systemPrefersReducedMotion() || isMobileDevice()) {
    return applyEnvironmentDefaults({ ...defaults }, {});
  }
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
  const motion = systemPrefersReducedMotion();
  settings.set({ ...defaults, reduceMotion: motion });
}

const UI_SCALE_MAP: Record<AppSettings['uiScale'], number> = {
  small: 0.875,
  normal: 1,
  large: 1.125,
};

/** Apply UI scale multiplier to the document root. */
export function initUiScale() {
  if (typeof document === 'undefined') return () => {};
  const apply = (scale: AppSettings['uiScale']) => {
    document.documentElement.style.fontSize = `${UI_SCALE_MAP[scale] * 100}%`;
    document.documentElement.dataset.uiScale = scale;
  };
  const unsub = settings.subscribe((s) => apply(s.uiScale));
  apply(loadSettings().uiScale);
  return unsub;
}

/** Sync reduce-motion class + listen for OS preference changes. */
export function initMotionPreferences() {
  if (typeof document === 'undefined') return () => {};
  const apply = (reduce: boolean) => {
    document.documentElement.classList.toggle('reduce-motion', reduce);
  };
  const unsub = settings.subscribe((s) => apply(s.reduceMotion));
  apply(loadSettings().reduceMotion);
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  const onMq = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw && 'reduceMotion' in JSON.parse(raw)) return;
    } catch { /* ignore */ }
    settings.update((s) => ({ ...s, reduceMotion: mq.matches }));
  };
  mq.addEventListener('change', onMq);
  return () => {
    unsub();
    mq.removeEventListener('change', onMq);
  };
}

/** Sync high-contrast class on the document root. */
export function initHighContrast() {
  if (typeof document === 'undefined') return () => {};
  const apply = (on: boolean) => {
    document.documentElement.classList.toggle('high-contrast', on);
  };
  const unsub = settings.subscribe((s) => apply(s.highContrast));
  apply(loadSettings().highContrast);
  return unsub;
}

/** Apply prefers-reduced-data when user has not set nebula/sprites explicitly. */
export function initDataPreferences() {
  if (typeof window === 'undefined') return () => {};
  const mq = window.matchMedia('(prefers-reduced-data: reduce)');
  const onMq = () => {
    if (!mq.matches) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if ('nebulaClouds' in parsed || 'galaxySprites' in parsed) return;
      }
    } catch { /* ignore */ }
    settings.update((s) => ({ ...s, nebulaClouds: false, galaxySprites: false }));
  };
  onMq();
  mq.addEventListener('change', onMq);
  return () => mq.removeEventListener('change', onMq);
}
