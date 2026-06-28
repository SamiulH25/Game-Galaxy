import { i as writable, t as derived } from "./shared2.js";
import "./index-server2.js";
//#region src/lib/stores/settings.ts
var STORAGE_KEY = "gamegalaxy-settings";
var defaults = {
	cameraRotSpeed: .6,
	starDensity: "medium",
	starBrightness: 1,
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
	uiScale: "normal",
	reduceMotion: false,
	highContrast: false,
	hapticsEnabled: true,
	doubleTapLaunch: false,
	mobileAutoFullscreen: false,
	fpsDisplay: false,
	resetTutorial: false
};
function systemPrefersReducedMotion() {
	if (typeof window === "undefined") return false;
	return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
function isMobileDevice() {
	if (typeof window === "undefined") return false;
	return window.innerWidth <= 640 || window.matchMedia("(pointer: coarse)").matches;
}
function prefersReducedData() {
	if (typeof window === "undefined") return false;
	return window.matchMedia("(prefers-reduced-data: reduce)").matches;
}
function applyEnvironmentDefaults(result, parsed) {
	if (!("reduceMotion" in parsed) && systemPrefersReducedMotion()) result.reduceMotion = true;
	if (!("mobileDefaultsApplied" in parsed) && isMobileDevice()) {
		result.starDensity = "low";
		result.galaxySprites = false;
		if (!("nebulaClouds" in parsed)) result.nebulaClouds = !prefersReducedData();
		result.mobileDefaultsApplied = true;
	}
	if (!("nebulaClouds" in parsed) && prefersReducedData()) {
		result.nebulaClouds = false;
		result.galaxySprites = false;
	}
	return result;
}
function loadSettings() {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw) {
			const parsed = JSON.parse(raw);
			return applyEnvironmentDefaults({
				...defaults,
				...parsed
			}, parsed);
		}
	} catch {}
	if (systemPrefersReducedMotion() || isMobileDevice()) return applyEnvironmentDefaults({ ...defaults }, {});
	return { ...defaults };
}
function saveSettings(settings) {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
	} catch {}
}
var settings = writable(loadSettings());
settings.subscribe((val) => {
	saveSettings(val);
});
var UI_SCALE_MAP = {
	small: .875,
	normal: 1,
	large: 1.125
};
/** Apply UI scale multiplier to the document root. */
function initUiScale() {
	if (typeof document === "undefined") return () => {};
	const apply = (scale) => {
		document.documentElement.style.fontSize = `${UI_SCALE_MAP[scale] * 100}%`;
		document.documentElement.dataset.uiScale = scale;
	};
	const unsub = settings.subscribe((s) => apply(s.uiScale));
	apply(loadSettings().uiScale);
	return unsub;
}
/** Sync reduce-motion class + listen for OS preference changes. */
function initMotionPreferences() {
	if (typeof document === "undefined") return () => {};
	const apply = (reduce) => {
		document.documentElement.classList.toggle("reduce-motion", reduce);
	};
	const unsub = settings.subscribe((s) => apply(s.reduceMotion));
	apply(loadSettings().reduceMotion);
	const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
	const onMq = () => {
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			if (raw && "reduceMotion" in JSON.parse(raw)) return;
		} catch {}
		settings.update((s) => ({
			...s,
			reduceMotion: mq.matches
		}));
	};
	mq.addEventListener("change", onMq);
	return () => {
		unsub();
		mq.removeEventListener("change", onMq);
	};
}
/** Sync high-contrast class on the document root. */
function initHighContrast() {
	if (typeof document === "undefined") return () => {};
	const apply = (on) => {
		document.documentElement.classList.toggle("high-contrast", on);
	};
	const unsub = settings.subscribe((s) => apply(s.highContrast));
	apply(loadSettings().highContrast);
	return unsub;
}
/** Apply prefers-reduced-data when user has not set nebula/sprites explicitly. */
function initDataPreferences() {
	if (typeof window === "undefined") return () => {};
	const mq = window.matchMedia("(prefers-reduced-data: reduce)");
	const onMq = () => {
		if (!mq.matches) return;
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			if (raw) {
				const parsed = JSON.parse(raw);
				if ("nebulaClouds" in parsed || "galaxySprites" in parsed) return;
			}
		} catch {}
		settings.update((s) => ({
			...s,
			nebulaClouds: false,
			galaxySprites: false
		}));
	};
	onMq();
	mq.addEventListener("change", onMq);
	return () => mq.removeEventListener("change", onMq);
}
//#endregion
//#region src/lib/stores/viewport.ts
var MOBILE_BP = 640;
var NARROW_BP = 400;
function readViewport() {
	if (typeof window === "undefined") return {
		mobile: false,
		narrow: false,
		coarse: false,
		standalone: false,
		width: 1024,
		height: 768
	};
	const w = window.innerWidth;
	const h = window.innerHeight;
	return {
		mobile: w <= MOBILE_BP,
		narrow: w <= NARROW_BP,
		coarse: window.matchMedia("(pointer: coarse)").matches,
		standalone: window.matchMedia("(display-mode: standalone)").matches,
		width: w,
		height: h
	};
}
function createViewportStore() {
	const { subscribe, set } = writable(readViewport());
	if (typeof window !== "undefined") {
		const update = () => {
			const state = readViewport();
			set(state);
			applyViewportAttrs(state);
		};
		window.addEventListener("resize", update);
		window.addEventListener("orientationchange", update);
		window.matchMedia("(pointer: coarse)").addEventListener("change", update);
		applyViewportAttrs(readViewport());
	}
	return { subscribe };
}
function applyViewportAttrs(v) {
	if (typeof document === "undefined") return;
	const el = document.documentElement;
	el.dataset.mobile = v.mobile ? "true" : "false";
	el.dataset.coarse = v.coarse ? "true" : "false";
	el.dataset.standalone = v.standalone ? "true" : "false";
	el.style.setProperty("--vw", `${v.width}px`);
	el.style.setProperty("--vh", `${v.height}px`);
}
var viewport = createViewportStore();
var isMobile = derived(viewport, ($v) => $v.mobile);
var isCoarse = derived(viewport, ($v) => $v.coarse);
function initViewport() {
	return viewport.subscribe(() => {});
}
//#endregion
//#region src/lib/stores/network.ts
function readQuality() {
	if (typeof navigator === "undefined") return "good";
	if (!navigator.onLine) return "offline";
	const conn = navigator.connection;
	if (conn?.saveData) return "slow";
	const et = conn?.effectiveType;
	if (et === "slow-2g" || et === "2g" || et === "3g") return "slow";
	return "good";
}
var { subscribe, set } = writable(readQuality());
var networkQuality = { subscribe };
function refreshNetworkQuality() {
	set(readQuality());
}
function initNetworkMonitor() {
	if (typeof window === "undefined") return () => {};
	const update = () => refreshNetworkQuality();
	window.addEventListener("online", update);
	window.addEventListener("offline", update);
	const conn = navigator.connection;
	conn?.addEventListener?.("change", update);
	update();
	return () => {
		window.removeEventListener("online", update);
		window.removeEventListener("offline", update);
		conn?.removeEventListener?.("change", update);
	};
}
//#endregion
export { isMobile as a, initHighContrast as c, settings as d, isCoarse as i, initMotionPreferences as l, networkQuality as n, viewport as o, initViewport as r, initDataPreferences as s, initNetworkMonitor as t, initUiScale as u };
