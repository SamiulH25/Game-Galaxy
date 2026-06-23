import { x as writable } from "./index-server.js";
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
	fpsDisplay: false,
	resetTutorial: false
};
function loadSettings() {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw) {
			const parsed = JSON.parse(raw);
			return {
				...defaults,
				...parsed
			};
		}
	} catch {}
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
//#endregion
export { settings as t };
