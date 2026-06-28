import { f as store_get, m as unsubscribe_stores, u as head } from "../../chunks/index-server.js";
import "../../chunks/shared2.js";
import { i as setVolume, t as initAudio } from "../../chunks/audio.js";
import { d as settings } from "../../chunks/network.js";
import { a as getSeasonInfo } from "../../chunks/progression.js";
import "../../chunks/galaxyRender2.js";
//#region src/routes/+layout.svelte
function _layout($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		let { children } = $$props;
		getSeasonInfo();
		function handleFirstClick() {
			initAudio();
			setVolume(store_get($$store_subs ??= {}, "$settings", settings).masterVolume);
			document.removeEventListener("click", handleFirstClick);
		}
		head("12qhfyh", $$renderer, ($$renderer) => {
			$$renderer.push(`<meta name="description" content="Explore a 3D galaxy of browser games. Play free — sign in to sync saves and scores."/> <meta name="theme-color" content="#0a0a2e"/> <link rel="manifest" href="/manifest.json"/> <meta property="og:title" content="Game Galaxy"/> <meta property="og:description" content="A universe of browser games — click a planet and launch instantly."/> <meta property="og:type" content="website"/> <meta name="twitter:card" content="summary_large_image"/>`);
		});
		$$renderer.push(`<div>`);
		children($$renderer);
		$$renderer.push(`<!----></div>`);
		if ($$store_subs) unsubscribe_stores($$store_subs);
	});
}
//#endregion
export { _layout as default };
