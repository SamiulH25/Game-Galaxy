import { _ as escape_html, a as attr_class, c as derived, d as store_get, f as stringify, g as attr, l as ensure_array_like, n as onDestroy, o as attr_style, p as unsubscribe_stores, s as bind_props } from "../../chunks/index-server.js";
import "../../chunks/audio.js";
import "../../chunks/settings.js";
import { c as currentSystemId, h as systems, l as games, m as showGame, o as isAuthenticated, p as showAuth, s as user, u as hasPlayedGame } from "../../chunks/social.js";
import "three";
//#endregion
//#region src/lib/threlte/Scene.svelte
function Scene($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		onDestroy(() => {
			games.set([]);
			systems.set([]);
			currentSystemId.set(null);
			hasPlayedGame.set(false);
		});
		$$renderer.push(`<div class="scene-container svelte-1pb5dcy"></div>`);
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
				$$renderer.push(`<span class="trigger-dot svelte-1dtd09c"${attr_style(`--star-color: ${stringify(sys.star?.starColor || "#ffcc44")}`)}></span> <span class="trigger-label">${escape_html(sys.name)}</span>`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]-->`);
		} else {
			$$renderer.push("<!--[-1-->");
			$$renderer.push(`<span class="trigger-label">Select System</span>`);
		}
		$$renderer.push(`<!--]--> <svg class="trigger-chevron svelte-1dtd09c" viewBox="0 0 10 6" width="10" height="6" aria-hidden="true"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"></path></svg></button> <div${attr_class("selector-dropdown svelte-1dtd09c", void 0, { "open": open })} role="listbox" aria-label="Star systems" tabindex="-1"><!--[-->`);
		const each_array = ensure_array_like(store_get($$store_subs ??= {}, "$systems", systems));
		for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
			let sys = each_array[$$index];
			$$renderer.push(`<button type="button"${attr_class("dropdown-item svelte-1dtd09c", void 0, { "active": sys.id === store_get($$store_subs ??= {}, "$currentSystemId", currentSystemId) })}${attr_style(`--item-color: ${stringify(sys.star?.starColor || "#ffcc44")}`)} role="option"${attr("aria-selected", sys.id === store_get($$store_subs ??= {}, "$currentSystemId", currentSystemId))}><span class="dropdown-item-dot svelte-1dtd09c"></span> <span class="dropdown-item-label svelte-1dtd09c">${escape_html(sys.name)}</span> <span class="dropdown-item-count svelte-1dtd09c">${escape_html(sys.game_count)}</span></button>`);
		}
		$$renderer.push(`<!--]--></div></div>`);
		if ($$store_subs) unsubscribe_stores($$store_subs);
	});
}
//#endregion
//#region src/lib/components/PlanetPopup.svelte
function PlanetPopup($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		$$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]-->`);
		if ($$store_subs) unsubscribe_stores($$store_subs);
	});
}
//#endregion
//#region src/lib/components/GameFrame.svelte
function GameFrame($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		let game = derived(() => store_get($$store_subs ??= {}, "$showGame", showGame));
		if (game()) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<div class="game-frame-overlay svelte-18mrs9z"><div class="game-frame-header svelte-18mrs9z"><div class="game-frame-info svelte-18mrs9z"><span class="game-frame-dot svelte-18mrs9z"></span> <h3 class="svelte-18mrs9z">${escape_html(game().title)}</h3></div> <div class="game-frame-actions svelte-18mrs9z"><button class="gf-btn svelte-18mrs9z">Save</button> <button class="gf-btn svelte-18mrs9z">Load</button> <button class="gf-btn gf-close svelte-18mrs9z">Close</button></div></div> <iframe id="game-iframe"${attr("src", `/games/${stringify(game().id)}/index.html`)} sandbox="allow-scripts" title="Game" class="svelte-18mrs9z"></iframe> `);
			$$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--> `);
			$$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--></div>`);
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
		if (store_get($$store_subs ??= {}, "$showAuth", showAuth)) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<div class="auth-overlay svelte-o861tn" role="dialog" aria-modal="true" tabindex="-1"><div class="auth-backdrop svelte-o861tn"></div> <div class="auth-card svelte-o861tn"><div class="auth-accent-line svelte-o861tn"></div> <div class="auth-header svelte-o861tn"><h2 class="svelte-o861tn">${escape_html("Log In")}</h2> <p class="auth-subtitle svelte-o861tn">${escape_html("Sign in to save your progress across games.")}</p></div> <form class="svelte-o861tn"><div class="auth-field svelte-o861tn"><label for="auth-username" class="svelte-o861tn">Username</label> <input id="auth-username"${attr("value", username)} type="text" placeholder="Enter username" autocomplete="username" required=""${attr("minlength", 3)}${attr("maxlength", 32)} class="svelte-o861tn"/></div> <div class="auth-field svelte-o861tn"><label for="auth-password" class="svelte-o861tn">Password</label> <input id="auth-password"${attr("value", password)} type="password" placeholder="Enter password" autocomplete="current-password" required=""${attr("minlength", 6)} class="svelte-o861tn"/></div> `);
			$$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--> <button type="submit" class="auth-submit svelte-o861tn">${escape_html("Log In")}</button></form> <p class="auth-toggle svelte-o861tn"><span class="svelte-o861tn">${escape_html("Don't have an account?")}</span> <button type="button" class="link-btn svelte-o861tn">${escape_html("Create one")}</button></p> <button class="auth-close svelte-o861tn" aria-label="Close auth dialog">✕</button></div></div>`);
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
		const systemList = derived(() => store_get($$store_subs ??= {}, "$systems", systems));
		const gameList = derived(() => store_get($$store_subs ??= {}, "$games", games));
		derived(() => store_get($$store_subs ??= {}, "$currentSystemId", currentSystemId));
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
			"closed": !open
		})} role="dialog" aria-label="Explorer panel">`);
		if (open) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<div class="panel-inner svelte-4epbbf"><div class="panel-header svelte-4epbbf"><h2 class="svelte-4epbbf">Explorer</h2> <button class="close-btn svelte-4epbbf" aria-label="Close panel"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button></div> <div class="panel-tabs svelte-4epbbf"><button${attr_class("tab-btn svelte-4epbbf", void 0, { "active": true })}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2" y="6" width="20" height="12" rx="2"></rect><path d="M12 12h.01"></path><path d="M6 12h.01"></path><path d="M18 12h.01"></path></svg> Games</button> <button${attr_class("tab-btn svelte-4epbbf", void 0, { "active": false })}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2z"></path></svg> Systems</button> <button${attr_class("tab-btn svelte-4epbbf", void 0, { "active": false })}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg> Info</button> <button${attr_class("tab-btn svelte-4epbbf", void 0, { "active": false })}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg> Settings</button> <button${attr_class("tab-btn svelte-4epbbf", void 0, { "active": false })}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"></circle><path d="M20 21a8 8 0 1 0-16 0"></path></svg> Profile</button></div> `);
			{
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<div class="tab-content svelte-4epbbf"><div class="search-wrap svelte-4epbbf"><svg class="search-icon svelte-4epbbf" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg> <input type="text" class="search-input svelte-4epbbf" placeholder="Search games…"${attr("value", searchQuery)}/> `);
				$$renderer.push("<!--[-1-->");
				$$renderer.push(`<!--]--></div> <div class="games-scroll svelte-4epbbf">`);
				if (Object.keys(gamesBySystem()).length === 0) {
					$$renderer.push("<!--[0-->");
					$$renderer.push(`<div class="empty-state svelte-4epbbf">No games match your search.</div>`);
				} else $$renderer.push("<!--[-1-->");
				$$renderer.push(`<!--]--> <!--[-->`);
				const each_array = ensure_array_like(Object.entries(gamesBySystem()));
				for (let $$index_1 = 0, $$length = each_array.length; $$index_1 < $$length; $$index_1++) {
					let [sysId, sysGames] = each_array[$$index_1];
					const sys = systemList().find((s) => s.id === sysId);
					$$renderer.push(`<div class="sys-group svelte-4epbbf"><div class="sys-group-header svelte-4epbbf"${attr_style(`--sys-color: ${stringify(starColor(sys?.star?.starColor))};`)}><span class="sys-dot svelte-4epbbf"></span> <span class="sys-name svelte-4epbbf">${escape_html(sys?.name || sysId)}</span> <span class="sys-count svelte-4epbbf">${escape_html(sysGames.length)}</span></div> <div class="sys-games svelte-4epbbf"><!--[-->`);
					const each_array_1 = ensure_array_like(sysGames);
					for (let $$index = 0, $$length = each_array_1.length; $$index < $$length; $$index++) {
						let game = each_array_1[$$index];
						$$renderer.push(`<button class="game-item svelte-4epbbf"><span class="game-planet svelte-4epbbf"${attr_style(`background: ${stringify(game.planetColor || "#444")};`)}></span> <span class="game-title svelte-4epbbf">${escape_html(game.title)}</span></button>`);
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
		derived(() => store_get($$store_subs ??= {}, "$systems", systems).length);
		$$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]-->`);
		if ($$store_subs) unsubscribe_stores($$store_subs);
	});
}
//#endregion
//#region src/routes/+page.svelte
function _page($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		let showDropdown = false;
		let panelOpen = false;
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			$$renderer.push(`<div>`);
			Scene($$renderer, {});
			$$renderer.push(`<!----> `);
			if (!store_get($$store_subs ??= {}, "$hasPlayedGame", hasPlayedGame) && !store_get($$store_subs ??= {}, "$isAuthenticated", isAuthenticated)) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<div class="hero-blur-overlay svelte-1uha8ag"></div> `);
				HeroPage($$renderer, {});
				$$renderer.push(`<!---->`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--> `);
			PlanetPopup($$renderer, {});
			$$renderer.push(`<!----> `);
			GameFrame($$renderer, {});
			$$renderer.push(`<!----> `);
			if (store_get($$store_subs ??= {}, "$hasPlayedGame", hasPlayedGame) || store_get($$store_subs ??= {}, "$isAuthenticated", isAuthenticated)) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<div id="ui-overlay" class="svelte-1uha8ag"><div class="title-bar svelte-1uha8ag">`);
				SystemSelector($$renderer, {});
				$$renderer.push(`<!----> <div class="title-bar-right svelte-1uha8ag" role="presentation"><div class="auth-dropdown-container svelte-1uha8ag"><button${attr_class("auth-btn svelte-1uha8ag", void 0, { "auth-active": showDropdown })}>${escape_html(store_get($$store_subs ??= {}, "$isAuthenticated", isAuthenticated) ? store_get($$store_subs ??= {}, "$user", user)?.username || "Account" : "Log In")} `);
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
			SidePanel($$renderer, {
				get open() {
					return panelOpen;
				},
				set open($$value) {
					panelOpen = $$value;
					$$settled = false;
				}
			});
			$$renderer.push(`<!----></div>`);
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
