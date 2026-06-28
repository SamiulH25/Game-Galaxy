import { _ as attr, a as attr_class, c as derived, f as store_get, l as ensure_array_like, m as unsubscribe_stores, n as onDestroy, o as attr_style, p as stringify, s as bind_props, u as head, v as escape_html } from "../../chunks/index-server.js";
import "../../chunks/shared2.js";
import "../../chunks/index-server2.js";
import { r as play } from "../../chunks/audio.js";
import { a as isMobile, d as settings, n as networkQuality, o as viewport } from "../../chunks/network.js";
import { A as sessionSummary, C as hasPlayedGame, D as markGamePlayed, F as systems, I as totalGameCount, L as isAuthenticated, M as showGame, N as showOnboardingCoach, O as newGameCount, P as stopGalaxyCatalogWatch, R as user, S as getExplorerRank, T as lastPlayedGame, _ as galaxyHint, b as games, c as markDailyMissionComplete, d as readPendingGuest, f as showUnchartedOnly, g as exploredCount, h as discoveredGameIds, i as getDailyMission, j as showAuth, l as pageTitle, m as currentSystemProgress, n as evaluateDailyMission, o as isDailyMissionComplete, p as currentSystemId, r as galaxySceneApi, s as isDailyMissionForGame, t as evaluateChallenge, u as queuePendingGuest, v as galaxyLoadError, w as isGameDiscovered, x as getDailyPlanet, y as galaxyLoadState, z as toasts } from "../../chunks/progression.js";
import { n as galaxyRenderReady } from "../../chunks/galaxyRender2.js";
import "../../chunks/navigation.js";
import "../../chunks/social.js";
//#region src/lib/threlte/Scene.svelte
function Scene($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		let webglFailed = false;
		onDestroy(() => {
			stopGalaxyCatalogWatch();
			galaxySceneApi.set(null);
		});
		$$renderer.push(`<div${attr_class("scene-container svelte-1pb5dcy", void 0, {
			"scene-fallback-active": webglFailed,
			"scene-pending": !store_get($$store_subs ??= {}, "$galaxyRenderReady", galaxyRenderReady) && true
		})}>`);
		if (!store_get($$store_subs ??= {}, "$galaxyRenderReady", galaxyRenderReady) && true) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<div class="scene-placeholder svelte-1pb5dcy" aria-hidden="true"></div>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> `);
		$$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--></div>`);
		if ($$store_subs) unsubscribe_stores($$store_subs);
	});
}
//#endregion
//#region src/lib/components/SystemSelector.svelte
function SystemSelector($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		let open = false;
		$$renderer.push(`<div class="system-selector svelte-1dtd09c" role="presentation"><button${attr_class("selector-trigger svelte-1dtd09c", void 0, { "open": open })} aria-haspopup="listbox"${attr("aria-expanded", open)}>`);
		if (store_get($$store_subs ??= {}, "$currentSystemId", currentSystemId)) {
			$$renderer.push("<!--[0-->");
			const sys = store_get($$store_subs ??= {}, "$systems", systems).find((s) => s.id === store_get($$store_subs ??= {}, "$currentSystemId", currentSystemId));
			if (sys) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<span class="trigger-dot svelte-1dtd09c"${attr_style(`--star-color: ${stringify(sys.star?.starColor || "#ffcc44")}`)}></span> <span class="trigger-label svelte-1dtd09c">${escape_html(sys.name)}</span> `);
				if (store_get($$store_subs ??= {}, "$currentSystemProgress", currentSystemProgress).total > 0) {
					$$renderer.push("<!--[0-->");
					$$renderer.push(`<span class="trigger-progress svelte-1dtd09c">${escape_html(store_get($$store_subs ??= {}, "$currentSystemProgress", currentSystemProgress).discovered)}/${escape_html(store_get($$store_subs ??= {}, "$currentSystemProgress", currentSystemProgress).total)}</span>`);
				} else $$renderer.push("<!--[-1-->");
				$$renderer.push(`<!--]-->`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]-->`);
		} else {
			$$renderer.push("<!--[-1-->");
			$$renderer.push(`<span class="trigger-label svelte-1dtd09c">Select System</span>`);
		}
		$$renderer.push(`<!--]--> <svg class="trigger-chevron svelte-1dtd09c" viewBox="0 0 10 6" width="10" height="6" aria-hidden="true"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"></path></svg></button> `);
		if (store_get($$store_subs ??= {}, "$isMobile", isMobile)) {
			$$renderer.push("<!--[0-->");
			$$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]-->`);
		} else {
			$$renderer.push("<!--[-1-->");
			$$renderer.push(`<div${attr_class("selector-dropdown svelte-1dtd09c", void 0, { "open": open })} role="listbox" aria-label="Star systems" tabindex="-1"><!--[-->`);
			const each_array_1 = ensure_array_like(store_get($$store_subs ??= {}, "$systems", systems));
			for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
				let sys = each_array_1[$$index_1];
				$$renderer.push(`<button type="button"${attr_class("dropdown-item svelte-1dtd09c", void 0, { "active": sys.id === store_get($$store_subs ??= {}, "$currentSystemId", currentSystemId) })}${attr_style(`--item-color: ${stringify(sys.star?.starColor || "#ffcc44")}`)} role="option"${attr("aria-selected", sys.id === store_get($$store_subs ??= {}, "$currentSystemId", currentSystemId))}><span class="dropdown-item-dot svelte-1dtd09c"></span> <span class="dropdown-item-label svelte-1dtd09c">${escape_html(sys.name)}</span> <span class="dropdown-item-count svelte-1dtd09c">${escape_html(sys.game_count)}</span></button>`);
			}
			$$renderer.push(`<!--]--></div>`);
		}
		$$renderer.push(`<!--]--></div>`);
		if ($$store_subs) unsubscribe_stores($$store_subs);
	});
}
//#endregion
//#region src/lib/components/PlanetPopup.svelte
function PlanetPopup($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		derived(() => {
			return "Planet preview";
		});
		derived(getDailyMission);
		derived(() => false);
		derived(isDailyMissionComplete);
		$$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]-->`);
		if ($$store_subs) unsubscribe_stores($$store_subs);
	});
}
//#endregion
//#region src/lib/components/AchievementCelebration.svelte
function AchievementCelebration($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { title, icon = "star", onDismiss } = $$props;
		const iconMap = {
			star: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
			trophy: "M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M6 9v1a6 6 0 0 0 12 0V9M12 15v4M8 21h8",
			bolt: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
			diamond: "M6 3h12l4 7-10 11L2 10l4-7z",
			moon: "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
		};
		let particles = Array.from({ length: 24 }, (_, i) => ({
			id: i,
			x: 10 + i * 37 % 80,
			delay: i * .08 % 1.2,
			hue: i % 3 === 0 ? "56" : i % 3 === 1 ? "190" : "270"
		}));
		$$renderer.push(`<div class="celebration-overlay svelte-s9ecnv" role="dialog" aria-modal="true" aria-label="Achievement unlocked"><button class="celebration-backdrop svelte-s9ecnv" aria-label="Dismiss"></button> <div class="celebration-card svelte-s9ecnv"><div class="celebration-rays svelte-s9ecnv" aria-hidden="true"></div> <div class="celebration-particles svelte-s9ecnv" aria-hidden="true"><!--[-->`);
		const each_array = ensure_array_like(particles);
		for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
			let p = each_array[$$index];
			$$renderer.push(`<span class="particle svelte-s9ecnv"${attr_style(`--x: ${stringify(p.x)}%; --delay: ${stringify(p.delay)}s; --hue: ${stringify(p.hue)}`)}></span>`);
		}
		$$renderer.push(`<!--]--></div> <div class="celebration-icon-wrap svelte-s9ecnv"><div class="celebration-icon-ring svelte-s9ecnv"></div> <div class="celebration-icon svelte-s9ecnv"><svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor" class="svelte-s9ecnv"><path${attr("d", iconMap[icon] || iconMap.star)} class="svelte-s9ecnv"></path></svg></div></div> <p class="celebration-label svelte-s9ecnv">Achievement Unlocked</p> <h2 class="celebration-title svelte-s9ecnv">${escape_html(title)}</h2> <p class="celebration-sub svelte-s9ecnv">Added to your explorer log</p> <button class="celebration-btn svelte-s9ecnv">Continue</button></div></div>`);
	});
}
//#endregion
//#region src/lib/components/ConfirmDialog.svelte
function ConfirmDialog($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { title = "Confirm", message, confirmLabel = "Confirm", cancelLabel = "Cancel", onConfirm, onCancel } = $$props;
		$$renderer.push(`<div class="confirm-overlay svelte-7e0w24" role="dialog" aria-modal="true"><button class="confirm-backdrop svelte-7e0w24" aria-label="Cancel"></button> <div class="confirm-card svelte-7e0w24"><h3 class="svelte-7e0w24">${escape_html(title)}</h3> <p class="svelte-7e0w24">${escape_html(message)}</p> <div class="confirm-actions svelte-7e0w24"><button class="btn ghost svelte-7e0w24">${escape_html(cancelLabel)}</button> <button class="btn primary svelte-7e0w24">${escape_html(confirmLabel)}</button></div></div></div>`);
	});
}
//#endregion
//#region src/lib/components/GameFrame.svelte
function GameFrame($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		typeof window !== "undefined" && window.location.origin;
		let game = derived(() => store_get($$store_subs ??= {}, "$showGame", showGame));
		let isEngineGame = derived(() => game()?.type && game().type !== "html");
		let achCelebration = null;
		let achQueue = [];
		let iframeLoading = true;
		let iframeError = false;
		let showCloseConfirm = false;
		let sessionScore = null;
		let sessionRank = null;
		let sessionPreviousRank = null;
		let sessionRankDelta = null;
		let sessionPersonalBest = false;
		let sessionWon = null;
		let sessionAchievements = [];
		let isFullscreen = false;
		let sessionScoreData = null;
		let gameSrc = derived(() => game()?.id ? `${typeof window !== "undefined" ? window.location.origin : ""}/games/${game().id}/index.html` : "about:blank");
		let portraitMode = false;
		let sessionElapsed = derived(() => {
			return 0;
		});
		derived(() => {
			const s = sessionElapsed();
			const m = Math.floor(s / 60);
			const r = s % 60;
			return m > 0 ? `${m}:${String(r).padStart(2, "0")}` : `${s}s`;
		});
		function dismissCelebration() {
			achCelebration = null;
			if (achQueue.length > 0) {
				const [next, ...rest] = achQueue;
				achQueue = rest;
				achCelebration = next;
			}
		}
		function finishClose() {
			markGamePlayed();
			showGame.set(null);
			play("doorClose");
		}
		function doClose() {
			const durationMs = 0;
			const isDaily = game()?.id ? isDailyMissionForGame(game().id) : false;
			const dailyTarget = isDaily ? getDailyMission()?.targetScore ?? null : null;
			const dailyBeat = isDaily ? evaluateDailyMission(sessionScore) : null;
			if (dailyBeat === true) markDailyMissionComplete();
			const challengeTarget = typeof game()?.__shareChallenge === "number" ? game().__shareChallenge : null;
			const challengeBeat = evaluateChallenge(sessionScore, challengeTarget);
			const guestHasProgress = !store_get($$store_subs ??= {}, "$isAuthenticated", isAuthenticated) && (sessionAchievements.length > 0 || false);
			if (guestHasProgress && game()?.id) queuePendingGuest({
				gameId: game().id,
				gameTitle: game().title,
				score: sessionScore,
				scoreData: sessionScoreData,
				achievements: sessionAchievements.filter((a) => a.id).map((a) => ({
					...a,
					id: a.id
				}))
			});
			sessionSummary.set({
				game: { ...game() },
				score: sessionScore,
				achievements: [...sessionAchievements],
				durationMs,
				rank: sessionRank,
				isPersonalBest: sessionPersonalBest,
				won: sessionWon,
				rankDelta: sessionRankDelta,
				previousRank: sessionPreviousRank,
				dailyMissionBeat: dailyBeat,
				dailyMissionTarget: dailyTarget,
				challengeBeat,
				challengeTarget,
				hadPendingGuest: guestHasProgress || !!readPendingGuest()
			});
			showCloseConfirm = false;
			if (isFullscreen) exitFullscreen();
			finishClose();
		}
		function exitFullscreen() {
			if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
			isFullscreen = false;
		}
		if (game()) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<div class="game-frame-overlay svelte-18mrs9z"><div class="game-frame-header svelte-18mrs9z"><div class="game-frame-info svelte-18mrs9z"><span${attr_class("game-frame-dot svelte-18mrs9z", void 0, { "loading": iframeLoading })}></span> <h3 class="svelte-18mrs9z">${escape_html(game().title)}</h3> `);
			$$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--></div> <div class="game-frame-actions svelte-18mrs9z">`);
			if (!isEngineGame()) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<button class="gf-btn svelte-18mrs9z">Save</button> <button class="gf-btn svelte-18mrs9z">Load</button>`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--> <button class="gf-btn svelte-18mrs9z" title="Fullscreen">⛶</button> <button class="gf-btn gf-close svelte-18mrs9z">Close</button></div></div> `);
			$$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--> `);
			if (isEngineGame() && portraitMode);
			else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--> <div class="iframe-wrap svelte-18mrs9z">`);
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<div class="iframe-loader svelte-18mrs9z"><div class="loader-ring svelte-18mrs9z"></div> <span class="svelte-18mrs9z">Loading ${escape_html(game().title)}…</span></div>`);
			$$renderer.push(`<!--]--> <iframe${attr("src", gameSrc())}${attr("title", game().title)}${attr_class("svelte-18mrs9z", void 0, { "hidden": iframeError })} onload="this.__e=event"></iframe></div> `);
			$$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--></div>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> `);
		if (achCelebration) {
			$$renderer.push("<!--[0-->");
			AchievementCelebration($$renderer, {
				title: achCelebration.title,
				icon: achCelebration.icon,
				onDismiss: dismissCelebration
			});
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> `);
		if (showCloseConfirm) {
			$$renderer.push("<!--[0-->");
			ConfirmDialog($$renderer, {
				title: "Close game?",
				message: "Unsaved progress in this session may be lost.",
				confirmLabel: "Close",
				cancelLabel: "Keep playing",
				onConfirm: doClose,
				onCancel: () => {
					showCloseConfirm = false;
				}
			});
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]-->`);
		if ($$store_subs) unsubscribe_stores($$store_subs);
	});
}
//#endregion
//#region src/lib/components/AuthModal.svelte
function AuthModal($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		let username = "";
		let password = "";
		let submitting = false;
		if (store_get($$store_subs ??= {}, "$showAuth", showAuth)) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<div class="auth-overlay svelte-o861tn" role="dialog" aria-modal="true" tabindex="-1"><div class="auth-backdrop svelte-o861tn"></div> <div class="auth-card svelte-o861tn"><div class="auth-accent-line svelte-o861tn"></div> <div class="auth-header svelte-o861tn"><h2 class="svelte-o861tn">${escape_html("Log In")}</h2> <p class="auth-subtitle svelte-o861tn">${escape_html("Sign in to save your progress across games.")}</p></div> <form class="svelte-o861tn"><div class="auth-field svelte-o861tn"><label for="auth-username" class="svelte-o861tn">Username</label> <input id="auth-username"${attr("value", username)} type="text" placeholder="Enter username" autocomplete="username" required=""${attr("minlength", 3)}${attr("maxlength", 32)} class="svelte-o861tn"/></div> <div class="auth-field svelte-o861tn"><label for="auth-password" class="svelte-o861tn">Password</label> <input id="auth-password"${attr("value", password)} type="password" placeholder="Enter password" autocomplete="current-password" required=""${attr("minlength", 6)} class="svelte-o861tn"/></div> `);
			$$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--> <button type="submit" class="auth-submit svelte-o861tn"${attr("disabled", submitting, true)}>`);
			$$renderer.push("<!--[-1-->");
			$$renderer.push(`${escape_html("Log In")}`);
			$$renderer.push(`<!--]--></button></form> <p class="auth-toggle svelte-o861tn"><span class="svelte-o861tn">${escape_html("Don't have an account?")}</span> <button type="button" class="link-btn svelte-o861tn">${escape_html("Create one")}</button></p> <button class="auth-close svelte-o861tn" aria-label="Close auth dialog">✕</button></div></div>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]-->`);
		if ($$store_subs) unsubscribe_stores($$store_subs);
	});
}
//#endregion
//#region src/lib/components/SidePanel.svelte
function SidePanel($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		let { open = false } = $$props;
		let searchQuery = "";
		let difficultyFilter = null;
		let genreFilter = null;
		const systemList = derived(() => store_get($$store_subs ??= {}, "$systems", systems));
		const gameList = derived(() => store_get($$store_subs ??= {}, "$games", games));
		derived(() => store_get($$store_subs ??= {}, "$currentSystemId", currentSystemId));
		const genreOptions = derived(() => {
			const set = /* @__PURE__ */ new Set();
			for (const g of gameList()) if (g.genre) g.genre.split(",").forEach((part) => set.add(part.trim()));
			return [...set].sort();
		});
		const filteredGames = derived(() => {
			let list = gameList();
			if (searchQuery.trim());
			return list;
		});
		const gamesBySystem = derived(() => {
			const map = {};
			for (const g of filteredGames()) {
				const sid = g.solarSystemId || "unknown";
				if (!map[sid]) map[sid] = [];
				map[sid].push(g);
			}
			return map;
		});
		derived(() => gameList().length);
		derived(() => systemList().length);
		function starColor(c) {
			return c || "#ffffff";
		}
		$$renderer.push(`<button${attr_class("panel-trigger svelte-4epbbf", void 0, { "panel-open": open })} aria-label="Toggle side panel"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg></button> `);
		if (open) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<div class="panel-backdrop svelte-4epbbf" role="button" tabindex="-1" aria-label="Close panel"></div>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> <div${attr_class("side-panel svelte-4epbbf", void 0, {
			"open": open,
			"closed": !open,
			"mobile-sheet": store_get($$store_subs ??= {}, "$isMobile", isMobile)
		})} role="dialog" aria-label="Explorer panel">`);
		if (open) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<div class="panel-inner svelte-4epbbf"${attr_style((store_get($$store_subs ??= {}, "$isMobile", isMobile), void 0))}>`);
			if (store_get($$store_subs ??= {}, "$isMobile", isMobile)) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<div class="sheet-grab svelte-4epbbf" aria-hidden="true"></div>`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--> <div class="panel-header svelte-4epbbf"><h2 class="svelte-4epbbf">Explorer</h2> <button class="close-btn svelte-4epbbf" aria-label="Close panel"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button></div> <div class="panel-tabs svelte-4epbbf"><button${attr_class("tab-btn svelte-4epbbf", void 0, { "active": true })}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2" y="6" width="20" height="12" rx="2"></rect><path d="M12 12h.01"></path><path d="M6 12h.01"></path><path d="M18 12h.01"></path></svg> Games</button> <button${attr_class("tab-btn svelte-4epbbf", void 0, { "active": false })}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2z"></path></svg> Systems</button> <button${attr_class("tab-btn svelte-4epbbf", void 0, {
				"active": false,
				"has-badge": store_get($$store_subs ??= {}, "$newGameCount", newGameCount) > 0
			})}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg> Journal `);
			if (store_get($$store_subs ??= {}, "$newGameCount", newGameCount) > 0) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<span class="tab-badge svelte-4epbbf">${escape_html(store_get($$store_subs ??= {}, "$newGameCount", newGameCount))}</span>`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--></button> <button${attr_class("tab-btn svelte-4epbbf", void 0, { "active": false })}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg> Settings</button> <button${attr_class("tab-btn svelte-4epbbf", void 0, { "active": false })}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"></circle><path d="M20 21a8 8 0 1 0-16 0"></path></svg> Profile</button></div> `);
			{
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<div class="tab-content svelte-4epbbf"><div class="search-wrap svelte-4epbbf"><svg class="search-icon svelte-4epbbf" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg> <input type="text" class="search-input svelte-4epbbf" placeholder="Search games… (Enter to locate)"${attr("value", searchQuery)}/> `);
				$$renderer.push("<!--[-1-->");
				$$renderer.push(`<!--]--></div> <div class="filter-row svelte-4epbbf"><button${attr_class("filter-chip svelte-4epbbf", void 0, { "active": true })}>All</button> <!--[-->`);
				const each_array = ensure_array_like([
					"Easy",
					"Medium",
					"Hard"
				]);
				for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
					let diff = each_array[$$index];
					$$renderer.push(`<button${attr_class("filter-chip svelte-4epbbf", void 0, { "active": difficultyFilter === diff })}>${escape_html(diff)}</button>`);
				}
				$$renderer.push(`<!--]--> <button${attr_class("filter-chip filter-uncharted svelte-4epbbf", void 0, { "active": store_get($$store_subs ??= {}, "$showUnchartedOnly", showUnchartedOnly) })}>Uncharted</button></div> `);
				if (genreOptions().length > 0) {
					$$renderer.push("<!--[0-->");
					$$renderer.push(`<div class="filter-row filter-row-wrap svelte-4epbbf"><!--[-->`);
					const each_array_1 = ensure_array_like(genreOptions().slice(0, 6));
					for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
						let genre = each_array_1[$$index_1];
						$$renderer.push(`<button${attr_class("filter-chip filter-chip-sm svelte-4epbbf", void 0, { "active": genreFilter === genre })}>${escape_html(genre)}</button>`);
					}
					$$renderer.push(`<!--]--></div>`);
				} else $$renderer.push("<!--[-1-->");
				$$renderer.push(`<!--]--> <div class="games-scroll svelte-4epbbf">`);
				if (Object.keys(gamesBySystem()).length === 0) {
					$$renderer.push("<!--[0-->");
					$$renderer.push(`<div class="empty-state svelte-4epbbf">No games match your search.</div>`);
				} else $$renderer.push("<!--[-1-->");
				$$renderer.push(`<!--]--> <!--[-->`);
				const each_array_2 = ensure_array_like(Object.entries(gamesBySystem()));
				for (let $$index_3 = 0, $$length = each_array_2.length; $$index_3 < $$length; $$index_3++) {
					let [sysId, sysGames] = each_array_2[$$index_3];
					const sys = systemList().find((s) => s.id === sysId);
					$$renderer.push(`<div class="sys-group svelte-4epbbf"><div class="sys-group-header svelte-4epbbf"${attr_style(`--sys-color: ${stringify(starColor(sys?.star?.starColor))};`)}><span class="sys-dot svelte-4epbbf"></span> <span class="sys-name svelte-4epbbf">${escape_html(sys?.name || sysId)}</span> <span class="sys-count svelte-4epbbf">${escape_html(sysGames.length)}</span></div> <div class="sys-games svelte-4epbbf"><!--[-->`);
					const each_array_3 = ensure_array_like(sysGames);
					for (let $$index_2 = 0, $$length = each_array_3.length; $$index_2 < $$length; $$index_2++) {
						let game = each_array_3[$$index_2];
						const discovered = store_get($$store_subs ??= {}, "$discoveredGameIds", discoveredGameIds).has(game.id);
						$$renderer.push(`<button${attr_class("game-item svelte-4epbbf", void 0, {
							"undiscovered": !discovered,
							"locked": !discovered
						})}${attr("title", discovered ? game.title : "Discover in the galaxy first")}><span${attr_class("game-planet svelte-4epbbf", void 0, { "mystery": !discovered })}${attr_style(`background: ${stringify(game.planetColor || "#444")};`)}></span> <span class="game-title svelte-4epbbf">${escape_html(discovered ? game.title : "???")}</span> `);
						if (discovered && game.difficulty) {
							$$renderer.push("<!--[0-->");
							$$renderer.push(`<span class="game-diff svelte-4epbbf">${escape_html(game.difficulty[0])}</span>`);
						} else $$renderer.push("<!--[-1-->");
						$$renderer.push(`<!--]--></button>`);
					}
					$$renderer.push(`<!--]--></div></div>`);
				}
				$$renderer.push(`<!--]--></div></div>`);
			}
			$$renderer.push(`<!--]--> `);
			$$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--> `);
			$$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--> `);
			$$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--> `);
			$$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--></div>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--></div>`);
		if ($$store_subs) unsubscribe_stores($$store_subs);
		bind_props($$props, { open });
	});
}
//#endregion
//#region src/lib/components/HeroPage.svelte
function HeroPage($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		derived(() => store_get($$store_subs ??= {}, "$games", games).length);
		$$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]-->`);
		if ($$store_subs) unsubscribe_stores($$store_subs);
	});
}
//#endregion
//#region src/lib/components/PostGameSummary.svelte
function PostGameSummary($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		let summary = derived(() => store_get($$store_subs ??= {}, "$sessionSummary", sessionSummary));
		let lbEntries = [];
		function findSimilar(game) {
			const tags = new Set(game.tags || []);
			const primaryGenre = game.genre?.split(",")[0]?.trim();
			return store_get($$store_subs ??= {}, "$games", games).filter((g) => g.id !== game.id).map((g) => {
				let score = 0;
				(g.tags || []).forEach((t) => {
					if (tags.has(t)) score += 2;
				});
				if (primaryGenre && g.genre?.includes(primaryGenre)) score += 3;
				if (g.solarSystemId === game.solarSystemId) score += 1;
				if (!store_get($$store_subs ??= {}, "$discoveredGameIds", discoveredGameIds).has(g.id)) score += 1;
				return {
					g,
					score
				};
			}).filter((x) => x.score > 0).sort((a, b) => b.score - a.score)[0]?.g || store_get($$store_subs ??= {}, "$games", games).find((g) => g.id !== game.id && g.solarSystemId === game.solarSystemId) || null;
		}
		let recommendedGame = derived(() => summary()?.game ? findSimilar(summary().game) : null);
		let recIsDiscovered = derived(() => recommendedGame() ? store_get($$store_subs ??= {}, "$discoveredGameIds", discoveredGameIds).has(recommendedGame().id) : false);
		function formatDuration(ms) {
			const sec = Math.max(1, Math.round(ms / 1e3));
			if (sec < 60) return `${sec}s`;
			const min = Math.floor(sec / 60);
			const rem = sec % 60;
			return rem > 0 ? `${min}m ${rem}s` : `${min}m`;
		}
		function formatScore(score) {
			if (score === null) return "—";
			return score.toLocaleString();
		}
		function outcomeLabel(s) {
			if (s.won === true) return "Mission Complete";
			if (s.won === false) return "Run Complete";
			return "Session Complete";
		}
		if (summary()) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<div class="summary-overlay svelte-q0yi2s" role="dialog" aria-modal="true"><button class="summary-backdrop svelte-q0yi2s" aria-label="Close"></button> <div${attr_class("summary-card svelte-q0yi2s", void 0, { "is-win": summary().won === true })}><div class="summary-glow svelte-q0yi2s" aria-hidden="true"></div> <div class="summary-header svelte-q0yi2s"><span class="summary-badge svelte-q0yi2s">${escape_html(outcomeLabel(summary()))}</span> <h2 class="svelte-q0yi2s">${escape_html(summary().game.title)}</h2> <span class="summary-meta svelte-q0yi2s">${escape_html(formatDuration(summary().durationMs))} played</span></div> <div class="summary-stats svelte-q0yi2s">`);
			if (summary().dailyMissionTarget != null && summary().dailyMissionBeat !== null) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<div${attr_class("mission-banner svelte-q0yi2s", void 0, { "mission-win": summary().dailyMissionBeat })}>`);
				if (summary().dailyMissionBeat) {
					$$renderer.push("<!--[0-->");
					$$renderer.push(`Daily mission complete — you beat ${escape_html(summary().dailyMissionTarget.toLocaleString())}!`);
				} else {
					$$renderer.push("<!--[-1-->");
					$$renderer.push(`Daily mission: needed ${escape_html(summary().dailyMissionTarget.toLocaleString())}+`);
				}
				$$renderer.push(`<!--]--></div>`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--> `);
			if (summary().challengeTarget != null && summary().challengeBeat !== null) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<div${attr_class("mission-banner svelte-q0yi2s", void 0, { "mission-win": summary().challengeBeat })}>`);
				if (summary().challengeBeat) {
					$$renderer.push("<!--[0-->");
					$$renderer.push(`Challenge cleared — you beat ${escape_html(summary().challengeTarget.toLocaleString())}!`);
				} else {
					$$renderer.push("<!--[-1-->");
					$$renderer.push(`Challenge missed — target was ${escape_html(summary().challengeTarget.toLocaleString())}`);
				}
				$$renderer.push(`<!--]--></div>`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--> `);
			if (summary().score !== null) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<div class="stat-block svelte-q0yi2s"><span class="stat-label svelte-q0yi2s">Score</span> <span class="stat-value svelte-q0yi2s">${escape_html(formatScore(summary().score))}</span> `);
				if (summary().isPersonalBest) {
					$$renderer.push("<!--[0-->");
					$$renderer.push(`<span class="stat-tag svelte-q0yi2s">Personal best</span>`);
				} else $$renderer.push("<!--[-1-->");
				$$renderer.push(`<!--]--></div>`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--> `);
			if (summary().rank) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<div class="stat-block svelte-q0yi2s"><span class="stat-label svelte-q0yi2s">Galaxy rank</span> <span class="stat-value svelte-q0yi2s">#${escape_html(summary().rank)}</span> `);
				if (summary().rankDelta && summary().rankDelta > 0) {
					$$renderer.push("<!--[0-->");
					$$renderer.push(`<span class="stat-tag rank-up svelte-q0yi2s">↑ ${escape_html(summary().rankDelta)} places</span>`);
				} else $$renderer.push("<!--[-1-->");
				$$renderer.push(`<!--]--></div>`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--> `);
			if (summary().achievements.length > 0) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<div class="stat-block stat-block-wide svelte-q0yi2s"><span class="stat-label svelte-q0yi2s">Unlocked</span> <div class="ach-list svelte-q0yi2s"><!--[-->`);
				const each_array = ensure_array_like(summary().achievements);
				for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
					let ach = each_array[$$index];
					$$renderer.push(`<span class="ach-chip svelte-q0yi2s">${escape_html(ach.title)}</span>`);
				}
				$$renderer.push(`<!--]--></div></div>`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--></div> `);
			if (lbEntries.length > 0) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<div class="mini-leaderboard svelte-q0yi2s"><span class="lb-title svelte-q0yi2s">Leaderboard</span> `);
				{
					$$renderer.push("<!--[-1-->");
					$$renderer.push(`<ol class="lb-list svelte-q0yi2s"><!--[-->`);
					const each_array_1 = ensure_array_like(lbEntries);
					for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
						let entry = each_array_1[$$index_1];
						$$renderer.push(`<li${attr_class("lb-row svelte-q0yi2s", void 0, { "is-you": store_get($$store_subs ??= {}, "$isAuthenticated", isAuthenticated) && entry.rank === summary().rank })}><span class="lb-rank svelte-q0yi2s">#${escape_html(entry.rank)}</span> <span class="lb-name svelte-q0yi2s">${escape_html(entry.username)}</span> <span class="lb-score svelte-q0yi2s">${escape_html(entry.score !== null ? entry.score.toLocaleString() : "—")}</span></li>`);
					}
					$$renderer.push(`<!--]--></ol>`);
				}
				$$renderer.push(`<!--]--></div>`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--> `);
			if (recommendedGame()) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<div class="recommendation svelte-q0yi2s"><span class="rec-label svelte-q0yi2s">You might also like</span> <span class="rec-game svelte-q0yi2s">${escape_html(recIsDiscovered() ? recommendedGame().title : "???")}</span></div>`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--> `);
			if (!store_get($$store_subs ??= {}, "$isAuthenticated", isAuthenticated) && summary().hadPendingGuest) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<div class="summary-nudge sync-nudge svelte-q0yi2s"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="svelte-q0yi2s"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path></svg> <span>Sign in now to keep this session's score and achievements.</span></div>`);
			} else if (!store_get($$store_subs ??= {}, "$isAuthenticated", isAuthenticated) && (summary().score !== null || summary().achievements.length > 0)) {
				$$renderer.push("<!--[1-->");
				$$renderer.push(`<div class="summary-nudge svelte-q0yi2s"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="svelte-q0yi2s"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path></svg> <span>Sign in to keep your score and achievements across devices.</span></div>`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--> <div class="summary-actions svelte-q0yi2s"><button class="action primary svelte-q0yi2s"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"></polygon></svg> Play again</button> `);
			if (recommendedGame()) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<button class="action svelte-q0yi2s">${escape_html(recIsDiscovered() ? `Try ${recommendedGame().title}` : "Find in galaxy")}</button>`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--> `);
			if (summary().rank || lbEntries.length > 0) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<button class="action svelte-q0yi2s">Full leaderboard</button>`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--> `);
			if (!store_get($$store_subs ??= {}, "$isAuthenticated", isAuthenticated)) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<button class="action accent svelte-q0yi2s">Sign in to save</button>`);
			} else {
				$$renderer.push("<!--[-1-->");
				$$renderer.push(`<button class="action ghost svelte-q0yi2s">Explore galaxy</button>`);
			}
			$$renderer.push(`<!--]--></div></div></div>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]-->`);
		if ($$store_subs) unsubscribe_stores($$store_subs);
	});
}
//#endregion
//#region src/lib/components/OnboardingCoach.svelte
function OnboardingCoach($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		derived(() => store_get($$store_subs ??= {}, "$settings", settings).reduceMotion);
		const steps = [
			{
				num: 1,
				text: "Click a planet to preview"
			},
			{
				num: 2,
				text: "Launch to play instantly"
			},
			{
				num: 3,
				text: "Sign in anytime to sync saves"
			}
		];
		if (store_get($$store_subs ??= {}, "$showOnboardingCoach", showOnboardingCoach)) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<div class="coach-bar svelte-1j8xvt9"><div class="coach-inner svelte-1j8xvt9"><div class="coach-steps svelte-1j8xvt9"><!--[-->`);
			const each_array = ensure_array_like(steps);
			for (let i = 0, $$length = each_array.length; i < $$length; i++) {
				let step = each_array[i];
				$$renderer.push(`<div class="coach-step svelte-1j8xvt9"><span class="step-num svelte-1j8xvt9">${escape_html(step.num)}</span> <span class="step-text svelte-1j8xvt9">${escape_html(step.text)}</span></div> `);
				if (i < steps.length - 1) {
					$$renderer.push("<!--[0-->");
					$$renderer.push(`<span class="step-arrow svelte-1j8xvt9" aria-hidden="true">→</span>`);
				} else $$renderer.push("<!--[-1-->");
				$$renderer.push(`<!--]-->`);
			}
			$$renderer.push(`<!--]--></div> <button class="coach-dismiss svelte-1j8xvt9">Got it</button></div></div>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]-->`);
		if ($$store_subs) unsubscribe_stores($$store_subs);
	});
}
//#endregion
//#region src/lib/components/WelcomeBackBar.svelte
function WelcomeBackBar($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		let showBar = derived(() => store_get($$store_subs ??= {}, "$hasPlayedGame", hasPlayedGame) && (store_get($$store_subs ??= {}, "$lastPlayedGame", lastPlayedGame) || store_get($$store_subs ??= {}, "$exploredCount", exploredCount) > 0));
		let greeting = derived(() => store_get($$store_subs ??= {}, "$isAuthenticated", isAuthenticated) && store_get($$store_subs ??= {}, "$user", user)?.username ? store_get($$store_subs ??= {}, "$user", user).username : "Explorer");
		let rank = derived(() => getExplorerRank(store_get($$store_subs ??= {}, "$exploredCount", exploredCount), store_get($$store_subs ??= {}, "$totalGameCount", totalGameCount), store_get($$store_subs ??= {}, "$hasPlayedGame", hasPlayedGame)));
		let dailyPlanet = derived(() => getDailyPlanet(store_get($$store_subs ??= {}, "$games", games)));
		let dailyDiscovered = derived(() => dailyPlanet() ? isGameDiscovered(dailyPlanet().id) : false);
		let dailyMission = derived(getDailyMission);
		let missionDone = derived(isDailyMissionComplete);
		let compactMode = derived(() => store_get($$store_subs ??= {}, "$viewport", viewport).mobile && store_get($$store_subs ??= {}, "$lastPlayedGame", lastPlayedGame));
		function formatLastPlayed(ts) {
			const diff = Date.now() - ts;
			const mins = Math.floor(diff / 6e4);
			if (mins < 1) return "just now";
			if (mins < 60) return `${mins}m ago`;
			const hours = Math.floor(mins / 60);
			if (hours < 24) return `${hours}h ago`;
			const days = Math.floor(hours / 24);
			if (days === 1) return "yesterday";
			return `${days}d ago`;
		}
		if (showBar()) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<div${attr_class("welcome-bar svelte-12inyj4", void 0, { "compact": compactMode() })}><div class="welcome-inner svelte-12inyj4">`);
			if (!compactMode()) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<div class="welcome-stats svelte-12inyj4"><span class="welcome-greeting svelte-12inyj4">Welcome back, <strong class="svelte-12inyj4">${escape_html(greeting())}</strong></span> <span class="welcome-divider svelte-12inyj4" aria-hidden="true">·</span> `);
				$$renderer.push("<!--[-1-->");
				$$renderer.push(`<!--]--> <span class="welcome-explored svelte-12inyj4">${escape_html(store_get($$store_subs ??= {}, "$exploredCount", exploredCount))}/${escape_html(store_get($$store_subs ??= {}, "$totalGameCount", totalGameCount))} explored</span> <span class="welcome-divider svelte-12inyj4" aria-hidden="true">·</span> <span class="welcome-rank svelte-12inyj4"${attr("title", rank().nextTitle && rank().remaining ? `${rank().remaining} more to ${rank().nextTitle}` : rank().title)}>${escape_html(rank().title)}</span></div>`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--> <div class="welcome-actions svelte-12inyj4">`);
			if (compactMode() && store_get($$store_subs ??= {}, "$lastPlayedGame", lastPlayedGame)) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<button class="continue-btn continue-btn-compact svelte-12inyj4"><span class="continue-dot svelte-12inyj4"${attr_style(`--pcolor: ${stringify(store_get($$store_subs ??= {}, "$lastPlayedGame", lastPlayedGame).planetColor || "#4488ff")}`)}></span> <span class="continue-text svelte-12inyj4"><span class="continue-label svelte-12inyj4">Continue</span> <span class="continue-game svelte-12inyj4">${escape_html(store_get($$store_subs ??= {}, "$lastPlayedGame", lastPlayedGame).title)}</span></span> <svg class="continue-arrow svelte-12inyj4" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"></polygon></svg></button>`);
			} else {
				$$renderer.push("<!--[-1-->");
				if (dailyPlanet()) {
					$$renderer.push("<!--[0-->");
					$$renderer.push(`<button class="daily-btn svelte-12inyj4" title="Today's highlighted planet"><span class="daily-label svelte-12inyj4">${escape_html(missionDone() ? "Daily ✓" : "Daily")}</span> <span class="daily-game svelte-12inyj4">${escape_html(dailyDiscovered() ? dailyPlanet().title : "???")} `);
					if (dailyMission() && !missionDone()) {
						$$renderer.push("<!--[0-->");
						$$renderer.push(`<span class="daily-target svelte-12inyj4">· ${escape_html(dailyMission().targetScore.toLocaleString())}+</span>`);
					} else $$renderer.push("<!--[-1-->");
					$$renderer.push(`<!--]--></span></button>`);
				} else $$renderer.push("<!--[-1-->");
				$$renderer.push(`<!--]--> `);
				if (store_get($$store_subs ??= {}, "$lastPlayedGame", lastPlayedGame)) {
					$$renderer.push("<!--[0-->");
					$$renderer.push(`<button class="continue-btn svelte-12inyj4"><span class="continue-dot svelte-12inyj4"${attr_style(`--pcolor: ${stringify(store_get($$store_subs ??= {}, "$lastPlayedGame", lastPlayedGame).planetColor || "#4488ff")}`)}></span> <span class="continue-text svelte-12inyj4"><span class="continue-label svelte-12inyj4">Continue</span> <span class="continue-game svelte-12inyj4">${escape_html(store_get($$store_subs ??= {}, "$lastPlayedGame", lastPlayedGame).title)}</span></span> <span class="continue-time svelte-12inyj4">${escape_html(formatLastPlayed(store_get($$store_subs ??= {}, "$lastPlayedGame", lastPlayedGame).playedAt))}</span> <svg class="continue-arrow svelte-12inyj4" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"></polygon></svg></button>`);
				} else $$renderer.push("<!--[-1-->");
				$$renderer.push(`<!--]-->`);
			}
			$$renderer.push(`<!--]--></div></div></div>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]-->`);
		if ($$store_subs) unsubscribe_stores($$store_subs);
	});
}
//#endregion
//#region src/lib/components/GalaxyHint.svelte
function GalaxyHint($$renderer) {
	var $$store_subs;
	if (store_get($$store_subs ??= {}, "$galaxyHint", galaxyHint)) {
		$$renderer.push("<!--[0-->");
		$$renderer.push(`<div class="galaxy-hint svelte-1m4u4az"><span class="hint-icon svelte-1m4u4az" aria-hidden="true">◎</span> <p class="svelte-1m4u4az">${escape_html(store_get($$store_subs ??= {}, "$galaxyHint", galaxyHint))}</p></div>`);
	} else $$renderer.push("<!--[-1-->");
	$$renderer.push(`<!--]-->`);
	if ($$store_subs) unsubscribe_stores($$store_subs);
}
//#endregion
//#region src/lib/components/KeyboardHelp.svelte
function KeyboardHelp($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		let { open = false } = $$props;
		const shortcuts = [
			{
				keys: ["Esc"],
				action: "Close popup, panel, or help"
			},
			{
				keys: ["S"],
				action: "Toggle command panel"
			},
			{
				keys: ["?"],
				action: "Show / hide this help"
			},
			{
				keys: ["[", "]"],
				action: "Previous / next solar system"
			},
			{
				keys: ["Enter"],
				action: "Locate top search result in galaxy"
			},
			{
				keys: ["Click"],
				action: "Select planet in 3D view"
			}
		];
		derived(() => store_get($$store_subs ??= {}, "$settings", settings).reduceMotion);
		if (open) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<div class="help-overlay svelte-dm3ami" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts"><button class="help-backdrop svelte-dm3ami" aria-label="Close help"></button> <div class="help-card svelte-dm3ami" role="presentation"><header class="help-header svelte-dm3ami"><h2 class="svelte-dm3ami">Keyboard &amp; controls</h2> <button class="help-close svelte-dm3ami" aria-label="Close">✕</button></header> <ul class="shortcut-list svelte-dm3ami"><!--[-->`);
			const each_array = ensure_array_like(shortcuts);
			for (let $$index_1 = 0, $$length = each_array.length; $$index_1 < $$length; $$index_1++) {
				let row = each_array[$$index_1];
				$$renderer.push(`<li class="shortcut-row svelte-dm3ami"><span class="shortcut-keys svelte-dm3ami"><!--[-->`);
				const each_array_1 = ensure_array_like(row.keys);
				for (let i = 0, $$length = each_array_1.length; i < $$length; i++) {
					let key = each_array_1[i];
					if (i > 0) {
						$$renderer.push("<!--[0-->");
						$$renderer.push(`<span class="key-sep svelte-dm3ami">/</span>`);
					} else $$renderer.push("<!--[-1-->");
					$$renderer.push(`<!--]--> <kbd class="svelte-dm3ami">${escape_html(key)}</kbd>`);
				}
				$$renderer.push(`<!--]--></span> <span class="shortcut-action svelte-dm3ami">${escape_html(row.action)}</span></li>`);
			}
			$$renderer.push(`<!--]--></ul> <p class="help-foot svelte-dm3ami">On touch devices, use the panel menu and tap planets directly.</p></div></div>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]-->`);
		if ($$store_subs) unsubscribe_stores($$store_subs);
		bind_props($$props, { open });
	});
}
//#endregion
//#region src/lib/components/GalaxyStatusBar.svelte
function GalaxyStatusBar($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		let retrying = false;
		if (store_get($$store_subs ??= {}, "$galaxyLoadState", galaxyLoadState) === "loading" && store_get($$store_subs ??= {}, "$galaxyLoadError", galaxyLoadError) === null) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<div class="status-bar status-loading svelte-tqyym7"><span class="status-dot svelte-tqyym7"></span> <span class="svelte-tqyym7">Syncing galaxy catalog…</span></div>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> `);
		if (store_get($$store_subs ??= {}, "$galaxyLoadState", galaxyLoadState) === "error") {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<div class="status-bar status-error svelte-tqyym7" role="alert"><span class="svelte-tqyym7">${escape_html(store_get($$store_subs ??= {}, "$galaxyLoadError", galaxyLoadError) || "Couldn't reach the server. Your local progress is safe.")}</span> <button class="retry-btn svelte-tqyym7"${attr("disabled", retrying, true)}>${escape_html("Retry")}</button></div>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]-->`);
		if ($$store_subs) unsubscribe_stores($$store_subs);
	});
}
//#endregion
//#region src/lib/components/GalaxyToast.svelte
function GalaxyToast($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		const kindClass = {
			info: "",
			success: "toast-success",
			error: "toast-error"
		};
		$$renderer.push(`<div class="toast-stack svelte-1raxggf" aria-live="polite"><!--[-->`);
		const each_array = ensure_array_like(store_get($$store_subs ??= {}, "$toasts", toasts));
		for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
			let toast = each_array[$$index];
			$$renderer.push(`<div${attr_class(`galaxy-toast ${stringify(kindClass[toast.kind] || "")}`, "svelte-1raxggf")} role="status"><span>${escape_html(toast.message)}</span> <button class="toast-dismiss svelte-1raxggf" aria-label="Dismiss">✕</button></div>`);
		}
		$$renderer.push(`<!--]--></div>`);
		if ($$store_subs) unsubscribe_stores($$store_subs);
	});
}
//#endregion
//#region src/lib/components/GalaxyRecenter.svelte
function GalaxyRecenter($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		if (store_get($$store_subs ??= {}, "$galaxySceneApi", galaxySceneApi)) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<button class="recenter-btn galaxy-recenter-btn svelte-1aslaec" title="Recenter galaxy view" aria-label="Recenter galaxy"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"></circle><path d="M12 2v4M12 18v4M2 12h4M18 12h4"></path></svg></button>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]-->`);
		if ($$store_subs) unsubscribe_stores($$store_subs);
	});
}
//#endregion
//#region src/lib/components/MobileBottomBar.svelte
function MobileBottomBar($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		let { panelOpen = false, onTogglePanel, onToggleHelp } = $$props;
		$$renderer.push(`<nav class="mobile-bottom-bar svelte-wsba0i" aria-label="Galaxy navigation"><button${attr_class("bar-btn svelte-wsba0i", void 0, { "active": panelOpen })} aria-label="Explorer menu"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg> <span>Menu</span></button> <button class="bar-btn svelte-wsba0i" aria-label="Recenter galaxy"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"></circle><path d="M12 2v4M12 18v4M2 12h4M18 12h4"></path></svg> <span>Center</span></button> <button class="bar-btn svelte-wsba0i" aria-label="Help"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg> <span>Help</span></button> <button class="bar-btn bar-btn-accent svelte-wsba0i"${attr("aria-label", store_get($$store_subs ??= {}, "$isAuthenticated", isAuthenticated) ? "Account" : "Sign in")}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"></circle><path d="M20 21a8 8 0 1 0-16 0"></path></svg> <span>${escape_html(store_get($$store_subs ??= {}, "$isAuthenticated", isAuthenticated) ? store_get($$store_subs ??= {}, "$user", user)?.username?.slice(0, 8) || "You" : "Sign in")}</span></button></nav>`);
		if ($$store_subs) unsubscribe_stores($$store_subs);
	});
}
//#endregion
//#region src/lib/components/AudioUnlockBanner.svelte
function AudioUnlockBanner($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		$$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]-->`);
		if ($$store_subs) unsubscribe_stores($$store_subs);
	});
}
//#endregion
//#region src/lib/components/NetworkHint.svelte
function NetworkHint($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		if (derived(() => store_get($$store_subs ??= {}, "$networkQuality", networkQuality) === "slow" || store_get($$store_subs ??= {}, "$networkQuality", networkQuality) === "offline")()) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<div class="network-hint svelte-e8vxin" role="status"><span>`);
			if (store_get($$store_subs ??= {}, "$networkQuality", networkQuality) === "offline") {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`You're offline — local progress is safe.`);
			} else {
				$$renderer.push("<!--[-1-->");
				$$renderer.push(`Slow connection — some features may lag.`);
			}
			$$renderer.push(`<!--]--></span> <button class="hint-dismiss svelte-e8vxin" aria-label="Dismiss">✕</button></div>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]-->`);
		if ($$store_subs) unsubscribe_stores($$store_subs);
	});
}
//#endregion
//#region src/lib/components/SiteFooter.svelte
function SiteFooter($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		$$renderer.push(`<footer class="site-footer svelte-4jwo3w"><button class="footer-link svelte-4jwo3w">About &amp; Privacy</button> <span class="footer-dot svelte-4jwo3w" aria-hidden="true">·</span> <span class="footer-copy">Play free — no download required</span></footer>`);
	});
}
//#endregion
//#region src/routes/+page.svelte
function _page($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		let showDropdown = false;
		let panelOpen = false;
		let showKeyboardHelp = false;
		let showGalaxyChrome = derived(() => store_get($$store_subs ??= {}, "$isAuthenticated", isAuthenticated));
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			head("1uha8ag", $$renderer, ($$renderer) => {
				$$renderer.title(($$renderer) => {
					$$renderer.push(`<title>${escape_html(store_get($$store_subs ??= {}, "$pageTitle", pageTitle))}</title>`);
				});
				$$renderer.push(`<meta property="og:title"${attr("content", store_get($$store_subs ??= {}, "$pageTitle", pageTitle))}/>`);
			});
			$$renderer.push(`<div>`);
			Scene($$renderer, {});
			$$renderer.push(`<!----> `);
			if (!store_get($$store_subs ??= {}, "$isAuthenticated", isAuthenticated)) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<div class="hero-gate svelte-1uha8ag" aria-hidden="false">`);
				HeroPage($$renderer, {});
				$$renderer.push(`<!----></div>`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--> `);
			if (showGalaxyChrome()) {
				$$renderer.push("<!--[0-->");
				PlanetPopup($$renderer, {});
				$$renderer.push(`<!----> `);
				GameFrame($$renderer, {});
				$$renderer.push(`<!----> `);
				PostGameSummary($$renderer, {});
				$$renderer.push(`<!----> `);
				OnboardingCoach($$renderer, {});
				$$renderer.push(`<!----> `);
				GalaxyHint($$renderer, {});
				$$renderer.push(`<!----> `);
				GalaxyStatusBar($$renderer, {});
				$$renderer.push(`<!----> `);
				GalaxyRecenter($$renderer, {});
				$$renderer.push(`<!---->`);
			} else {
				$$renderer.push("<!--[-1-->");
				GalaxyToast($$renderer, {});
				$$renderer.push(`<!----> `);
				NetworkHint($$renderer, {});
				$$renderer.push(`<!---->`);
			}
			$$renderer.push(`<!--]--> `);
			AudioUnlockBanner($$renderer, {});
			$$renderer.push(`<!----> `);
			KeyboardHelp($$renderer, {
				get open() {
					return showKeyboardHelp;
				},
				set open($$value) {
					showKeyboardHelp = $$value;
					$$settled = false;
				}
			});
			$$renderer.push(`<!----> `);
			if (showGalaxyChrome()) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<div id="ui-overlay" class="svelte-1uha8ag"><div class="title-bar svelte-1uha8ag">`);
				SystemSelector($$renderer, {});
				$$renderer.push(`<!----> `);
				WelcomeBackBar($$renderer, {});
				$$renderer.push(`<!----> <div class="title-bar-right desktop-only svelte-1uha8ag" role="presentation"><button class="help-btn svelte-1uha8ag" title="Keyboard shortcuts (?)" aria-label="Keyboard shortcuts">?</button> <div class="auth-dropdown-container svelte-1uha8ag"><button${attr_class("auth-btn svelte-1uha8ag", void 0, { "auth-active": showDropdown })}>${escape_html(store_get($$store_subs ??= {}, "$isAuthenticated", isAuthenticated) ? store_get($$store_subs ??= {}, "$user", user)?.username || "Account" : "Log In")} `);
				if (store_get($$store_subs ??= {}, "$isAuthenticated", isAuthenticated)) {
					$$renderer.push("<!--[0-->");
					$$renderer.push(`<svg${attr_class("dropdown-chevron svelte-1uha8ag", void 0, { "chevron-open": showDropdown })} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M6 9l6 6 6-6"></path></svg>`);
				} else $$renderer.push("<!--[-1-->");
				$$renderer.push(`<!--]--></button> `);
				$$renderer.push("<!--[-1-->");
				$$renderer.push(`<!--]--></div></div></div></div>`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--> `);
			AuthModal($$renderer, {});
			$$renderer.push(`<!----> `);
			if (showGalaxyChrome()) {
				$$renderer.push("<!--[0-->");
				SidePanel($$renderer, {
					get open() {
						return panelOpen;
					},
					set open($$value) {
						panelOpen = $$value;
						$$settled = false;
					}
				});
				$$renderer.push(`<!----> `);
				MobileBottomBar($$renderer, {
					panelOpen,
					onTogglePanel: () => {
						panelOpen = !panelOpen;
					},
					onToggleHelp: () => {
						showKeyboardHelp = !showKeyboardHelp;
					}
				});
				$$renderer.push(`<!----> `);
				SiteFooter($$renderer, {});
				$$renderer.push(`<!---->`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--></div>`);
		}
		do {
			$$settled = true;
			$$inner_renderer = $$renderer.copy();
			$$render_inner($$inner_renderer);
		} while (!$$settled);
		$$renderer.subsume($$inner_renderer);
		if ($$store_subs) unsubscribe_stores($$store_subs);
	});
}
//#endregion
export { _page as default };
