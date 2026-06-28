import { writable, derived } from 'svelte/store';

export interface ViewportState {
  mobile: boolean;
  narrow: boolean;
  coarse: boolean;
  standalone: boolean;
  width: number;
  height: number;
}

const MOBILE_BP = 640;
const NARROW_BP = 400;

function readViewport(): ViewportState {
  if (typeof window === 'undefined') {
    return { mobile: false, narrow: false, coarse: false, standalone: false, width: 1024, height: 768 };
  }
  const w = window.innerWidth;
  const h = window.innerHeight;
  return {
    mobile: w <= MOBILE_BP,
    narrow: w <= NARROW_BP,
    coarse: window.matchMedia('(pointer: coarse)').matches,
    standalone: window.matchMedia('(display-mode: standalone)').matches,
    width: w,
    height: h,
  };
}

function createViewportStore() {
  const { subscribe, set } = writable<ViewportState>(readViewport());

  if (typeof window !== 'undefined') {
    const update = () => {
      const state = readViewport();
      set(state);
      applyViewportAttrs(state);
    };
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    const mq = window.matchMedia('(pointer: coarse)');
    mq.addEventListener('change', update);
    applyViewportAttrs(readViewport());
  }

  return { subscribe };
}

function applyViewportAttrs(v: ViewportState) {
  if (typeof document === 'undefined') return;
  const el = document.documentElement;
  el.dataset.mobile = v.mobile ? 'true' : 'false';
  el.dataset.coarse = v.coarse ? 'true' : 'false';
  el.dataset.standalone = v.standalone ? 'true' : 'false';
  el.style.setProperty('--vw', `${v.width}px`);
  el.style.setProperty('--vh', `${v.height}px`);
}

export const viewport = createViewportStore();
export const isMobile = derived(viewport, ($v) => $v.mobile);
export const isCoarse = derived(viewport, ($v) => $v.coarse);

let scrollLockCount = 0;
let savedScrollY = 0;

/** Prevent background scroll when overlays are open (iOS-safe). */
export function lockBodyScroll() {
  if (typeof document === 'undefined') return () => {};
  scrollLockCount += 1;
  if (scrollLockCount === 1) {
    savedScrollY = window.scrollY;
    document.body.classList.add('scroll-locked');
    document.body.style.top = `-${savedScrollY}px`;
  }
  return () => unlockBodyScroll();
}

export function unlockBodyScroll() {
  if (typeof document === 'undefined') return;
  scrollLockCount = Math.max(0, scrollLockCount - 1);
  if (scrollLockCount === 0) {
    document.body.classList.remove('scroll-locked');
    document.body.style.top = '';
    window.scrollTo(0, savedScrollY);
  }
}

export function initViewport() {
  return viewport.subscribe(() => {});
}
