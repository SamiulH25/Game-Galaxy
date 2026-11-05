# Making games for Game Galaxy

A game is a folder of static files in `games/`. The folder name is the game's id and URL slug.

```
games/my-game/
  game.json      ← manifest (required)
  index.html     ← entry page (required; change with "entry")
  cover.svg      ← optional cover art (any image)
  …              ← anything else: js, css, images, audio, wasm
```

The fastest start is the template, a small but complete game that uses every SDK feature:

```bash
npm run new-game -- my-game --title "My Game" --system aurora
```

The new planet shows up in the galaxy within a few seconds. There's no rebuild or restart, in dev or in production.

Folders whose names start with `_` or `.` are ignored, so `_archive/` and `_drafts/` are safe places for old or unfinished games. You can also set `"hidden": true` in `game.json` to keep a game out of the galaxy while still serving its files.

## game.json

Only `title`, `description` and `system` are required. Everything about the planet is generated deterministically from the id unless you set it. Add `"$schema": "../../schemas/game.schema.json"` for autocomplete in your editor.

```jsonc
{
	"$schema": "../../schemas/game.schema.json",
	"title": "My Game", // ≤ 60 chars
	"tagline": "One line that sells it.", // ≤ 120 chars, shown on cards and labels
	"description": "A paragraph or two for the details page.",
	"system": "aurora", // a system id from games/systems.json
	"genres": ["puzzle", "strategy"], // ≤ 6, used for library filters
	"controls": "Arrow keys to move, Space to jump.",
	"entry": "index.html", // default
	"cover": "cover.png", // optional; otherwise the planet is drawn
	"order": 0, // orbit order inside the system (lower = closer to the star)
	"hidden": false,

	"planet": {
		"name": "Kepler's Rest", // label in the galaxy (defaults to title)
		"kind": "gas", // terran | rocky | gas | ice | lava | ocean
		"color": "#d9a066", // base surface colour
		"accent": "#7a4a2a", // bands, oceans, lava veins…
		"size": 1.4, // 0.4–2.5
		"rings": true, // or { "color": "#e8d8a0", "tilt": 0.3 }
		"moons": 2, // 0–4
		"atmosphere": true // or a colour like "#88bbff"; false for none
	},

	// Add "scoring" to get a leaderboard. Each player keeps their best.
	"scoring": { "label": "Points", "order": "desc", "format": "number" },
	// order: "desc" = higher is better, "asc" = lower is better (times, moves)
	// format: "number" or "time" (score in seconds, shown as m:ss.cc)

	"achievements": [
		{ "id": "first-win", "title": "First Light", "description": "Win a game.", "icon": "star" },
		{ "id": "no-damage", "title": "Untouched", "description": "Win without taking damage.", "icon": "shield", "secret": true }
	]
}
```

Achievement icons: `star`, `trophy`, `bolt`, `diamond`, `moon`, `flame`, `shield`, `crown`, `heart`, `target`, `rocket`, `compass`. Secret achievements show as "Hidden achievement" until they're unlocked.

When a manifest is invalid, the game is skipped and the reason is logged by the server (`[catalog] my-game/game.json: …`). The rest of the galaxy keeps working.

### systems.json

```json
{
	"systems": [{ "id": "aurora", "name": "Aurora Drift", "description": "…", "star": { "color": "#8fc8ff", "size": 1.3 } }]
}
```

`star.size` is 0.5–2. Systems are placed along the galaxy's spiral arms automatically. To pin one, give it `"position": [x, z]`.

## The SDK

Include it, then use the global `Galaxy`. Every method returns a Promise.

```html
<script src="/sdk/galaxy.js"></script>
```

| Call | Resolves with | Notes |
| --- | --- | --- |
| `Galaxy.ready()` | `{ gameId, player: { name, guest }, settings: { muted, reducedMotion } }` | Call once when your game has loaded. |
| `Galaxy.load()` | your saved value, or `null` | |
| `Galaxy.save(value)` | `{ savedAt, cloud }` | Any JSON value up to 256 KB. Rapid calls are coalesced; every promise still resolves. |
| `Galaxy.clearSave()` | `{ ok: true }` | |
| `Galaxy.submitScore(n)` | `{ best, personalBest, rank }` | Needs `scoring` in game.json. `rank` is `null` for guests. The player shows a toast for personal bests. |
| `Galaxy.unlock(id)` | `{ new }` | `id` must be declared in game.json. The player celebrates new unlocks. |
| `Galaxy.achievements()` | `string[]` of unlocked ids | |
| `Galaxy.on(event, fn)` | an unsubscribe function | Events: `pause` (tab hidden), `resume`, `settings` (`{ muted, reducedMotion }`). |

A typical boot:

```js
Galaxy.ready()
	.then((info) => {
		applySettings(info.settings);
		return Galaxy.load();
	})
	.then((saved) => startGame(saved ?? freshState()));

Galaxy.on('pause', pauseGame);
Galaxy.on('settings', applySettings);
```

Treat SDK failures as non-fatal. A player can lose their connection mid-game, so `.catch()` and keep playing.

### Guests and accounts

The SDK behaves the same for everyone. For guests, the player keeps saves, best scores and achievements in the browser. When the guest signs in, that progress is imported into their account:
- existing cloud saves are never overwritten;
- scores still keep only the best;
- achievements merge.

### The sandbox

Games run with an **opaque origin**. In practice:
- `localStorage`, `sessionStorage`, IndexedDB and cookies are unavailable, so save through `Galaxy.save`;
- `alert()`, `confirm()`, pop-ups and top-level navigation are blocked;
- `fetch()` to your own folder works (game files are served with `Access-Control-Allow-Origin: *`), as do CDN scripts and Google Fonts;
- Web Audio, Canvas, WebGL, WebAssembly, the Gamepad API, pointer lock and keyboard input all work;
- audio still needs a user gesture before it starts, as on any page.

### Testing

- `npm run dev`, then open `http://localhost:5173/play/<id>`. That's the real player, with saves, toasts and leaderboards.
- Opening `/g/<id>/index.html` directly runs the game alone. The SDK falls back to in-memory storage, which is handy for quick iteration.
- Use the browser devtools console for both the player and the game frame.

## Quality bar

The games that feel best here share a few habits:
- They're fully playable with mouse, touch and keyboard. Size the canvas to the viewport and cap `devicePixelRatio` at 2.
- They have a clear goal, a clear end state and a reason to play again: a score, progression or unlocks.
- They pause on the `pause` event and respect `settings.muted` and `settings.reducedMotion`.
- They're self-contained, with no build step needed. Plain scripts or a single bundled file are both fine.
- They use the visual language of the site: dark space backgrounds, one confident accent colour, legible type.
