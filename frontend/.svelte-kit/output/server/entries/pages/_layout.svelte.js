import { d as store_get, p as unsubscribe_stores } from "../../chunks/index-server.js";
import { r as setVolume, t as initAudio } from "../../chunks/audio.js";
import { t as settings } from "../../chunks/settings.js";
//#region src/routes/+layout.svelte
function _layout($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		let { children } = $$props;
		function handleFirstClick() {
			initAudio();
			setVolume(store_get($$store_subs ??= {}, "$settings", settings).masterVolume);
			document.removeEventListener("click", handleFirstClick);
		}
		$$renderer.push(`<div>`);
		children($$renderer);
		$$renderer.push(`<!----></div>`);
		if ($$store_subs) unsubscribe_stores($$store_subs);
	});
}
//#endregion
export { _layout as default };
