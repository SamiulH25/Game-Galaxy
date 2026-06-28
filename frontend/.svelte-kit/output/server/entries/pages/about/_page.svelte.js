import { u as head } from "../../../chunks/index-server.js";
import "../../../chunks/navigation.js";
//#region src/routes/about/+page.svelte
function _page($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		head("cwls5q", $$renderer, ($$renderer) => {
			$$renderer.title(($$renderer) => {
				$$renderer.push(`<title>About — Game Galaxy</title>`);
			});
			$$renderer.push(`<meta name="description" content="About Game Galaxy — a browser game portal with cloud saves, achievements, and a 3D galaxy to explore."/>`);
		});
		$$renderer.push(`<div class="about-page svelte-cwls5q"><nav class="about-nav svelte-cwls5q"><button class="back-btn svelte-cwls5q">← Galaxy</button></nav> <main class="about-content svelte-cwls5q"><h1 class="svelte-cwls5q">About Game Galaxy</h1> <p class="lead svelte-cwls5q">Game Galaxy is a browser-first arcade — explore a 3D star map, discover worlds, and launch games instantly. No install, no app store.</p> <section class="svelte-cwls5q"><h2 class="svelte-cwls5q">How it works</h2> <ul class="svelte-cwls5q"><li class="svelte-cwls5q">Click planets in the galaxy to preview and launch games.</li> <li class="svelte-cwls5q">Play as a guest — sign in anytime to sync scores, saves, and achievements.</li> <li class="svelte-cwls5q">Progress is stored locally when offline; cloud sync resumes when you reconnect.</li></ul></section> <section class="svelte-cwls5q"><h2 class="svelte-cwls5q">Your data</h2> <ul class="svelte-cwls5q"><li class="svelte-cwls5q"><strong>Local:</strong> discovery progress, settings, visit streak, and session preferences stay in your browser.</li> <li class="svelte-cwls5q"><strong>Account:</strong> username, saves, scores, and achievements are stored on our server when signed in.</li> <li class="svelte-cwls5q">We do not sell your data. Auth tokens stay in local storage until you sign out.</li></ul></section> <section class="svelte-cwls5q"><h2 class="svelte-cwls5q">Offline &amp; errors</h2> <p class="svelte-cwls5q">If the server is unreachable, you can still browse discovered games and play locally. Leaderboards and cloud saves need a connection — the site will tell you when sync is unavailable.</p></section> <section class="svelte-cwls5q"><h2 class="svelte-cwls5q">Contact</h2> <p class="svelte-cwls5q">Built as an open exploration of what a modern browser game hub can feel like.</p></section></main></div>`);
	});
}
//#endregion
export { _page as default };
