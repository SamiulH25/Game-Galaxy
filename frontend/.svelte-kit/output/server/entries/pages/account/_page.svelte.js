import { c as derived, f as store_get, m as unsubscribe_stores } from "../../../chunks/index-server.js";
import "../../../chunks/shared2.js";
import "../../../chunks/index-server2.js";
import "../../../chunks/audio.js";
import { F as systems, R as user, b as games } from "../../../chunks/progression.js";
import "../../../chunks/client.js";
import "../../../chunks/navigation.js";
import "../../../chunks/social.js";
//#endregion
//#region src/routes/account/+page.svelte
function _page($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		derived(() => store_get($$store_subs ??= {}, "$games", games));
		derived(() => store_get($$store_subs ??= {}, "$systems", systems));
		derived(() => store_get($$store_subs ??= {}, "$games", games).filter((g) => g.id).map((g) => ({
			id: g.id,
			title: g.title
		})));
		derived(() => store_get($$store_subs ??= {}, "$user", user)?.created_at ? new Date(store_get($$store_subs ??= {}, "$user", user).created_at).toLocaleDateString("en-US", {
			year: "numeric",
			month: "long",
			day: "numeric"
		}) : "—");
		derived(() => null);
		$$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> `);
		$$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]-->`);
		if ($$store_subs) unsubscribe_stores($$store_subs);
	});
}
//#endregion
export { _page as default };
