---
name: game-galaxy-games
description: >-
  Build high-quality HTML games for Game Galaxy 2.0. Use when creating,
  editing, or porting games in games/, writing manifest.json, integrating
  bridge.js saves, or exporting Godot web builds for the galaxy portal.
---

# Game Galaxy 2.0 — HTML Game Development

## Quality bar (non-negotiable)

From project taste and existing shipped games:

1. **Visually stunning** — sci-fi / game-console aesthetic; never browser-default buttons/inputs
2. **Beatable** — clear win condition and lose condition
3. **Saves** — persist progress via `window.gameBridge` (see below)
4. **Multi-file structure** — `index.html`, `style.css`, `js/*.js`; not one giant HTML blob
5. **No ES modules** — use IIFE pattern + `window.GameNamespace` globals and `<script src>` tags
6. **Mobile-aware** — touch controls or tap-friendly UI where applicable

Reference implementations (read before building):

| Game | Why it's good |
|------|----------------|
| `games/022-crystal-nexus/` | Polished HUD, overlays, fonts, particle feel, full save/load |
| `games/023-neon-siege/` | WebGL renderer split from game logic, high-score persistence |
| `games/000-template-game/` | Full starter: Star Salvage demo, bridge, HUD, multi-file split |

## File layout

```
games/NNN-my-game/
  manifest.json
  index.html          # shell + HUD + overlays
  style.css           # all UI styling
  thumbnail.svg
  js/
    engine.js         # pure game state / rules
    renderer.js       # canvas/WebGL drawing only
    audio.js          # Web Audio synth (optional)
    main.js           # loop, input, bridge, screen flow
```

## manifest.json essentials

```json
{
  "title": "My Game",
  "description": "Short blurb for planet popup",
  "planetName": "My Planet",
  "solarSystemId": "alpha-centauri",
  "solarSystemName": "Alpha Centauri",
  "planetColor": "#44dd88",
  "planetSize": 1.0,
  "orbitRadius": 10,
  "orbitSpeed": 0.4,
  "tags": ["arcade", "action"],
  "type": "html"
}
```

For Godot exports use `"type": "godot"` and follow `docs/godot-game-guide.md`.

## Bridge integration (required)

In `index.html`:

```html
<script src="../bridge.js"></script>
```

In `main.js` after win/level/score changes:

```js
window.gameBridge.save({ level: 3, score: 5000, highScore: 12000 });
```

On boot:

```js
window.gameBridge.load().then(function(data) {
  if (data) { /* restore state */ }
});
```

Optional: `unlockAchievement(id)`, `submitScore({ score, level })`.

## Architecture pattern

Split concerns like Crystal Nexus / Neon Siege:

```
engine.js   → state machine, rules, collision, scoring (no DOM)
renderer.js → draw calls only; receives state snapshots
main.js     → requestAnimationFrame loop, keyboard/touch, overlays, bridge
audio.js    → procedural Web Audio (no external mp3 required)
```

Expose namespaces:

```js
window.MyGame = window.MyGame || {};
(function(NS) { /* ... */ })(window.MyGame);
```

## When to use a framework (prefer over raw canvas)

Raw 2D canvas alone produces mediocre games. Pick by complexity:

| Complexity | Stack | CDN example |
|------------|-------|-------------|
| Arcade / platformer / shooter | **Phaser 3** | `<script src="https://cdn.jsdelivr.net/npm/phaser@3.80.1/dist/phaser.min.js">` |
| Particle-heavy / UI-rich 2D | **PixiJS** | `<script src="https://cdn.jsdelivr.net/npm/pixi.js@7.4.2/dist/pixi.min.js">` |
| Turn-based / complex UI / tactics | **Godot 4** | Use `games/galaxy-godot-template/` + `GalaxyAPI.gd` |
| Custom shader arcade | **WebGL2** | Follow `games/023-neon-siege/js/renderer.js` pattern |

Phaser/Pixi work with script tags — no bundler required.

## Visual polish checklist

Before calling a game done:

- [ ] Custom font (Google Fonts: Orbitron, Rajdhani, Exo 2 — see Crystal Nexus)
- [ ] Dark space background with gradient or starfield
- [ ] Glowing accents matching `planetColor` from manifest
- [ ] Screen flow: title → play → pause → game over → retry
- [ ] HUD with labeled stats (SCORE, LEVEL, LIVES)
- [ ] CSS transitions on overlays; `hidden` class toggle pattern
- [ ] Canvas scales to viewport (`resize` handler)
- [ ] Touch buttons for mobile (`touch-controls` div)

## Audio

Prefer procedural Web Audio (see `frontend/src/lib/audio.ts` for synth patterns).
Short bleeps on: pickup, damage, level up, game over.

## Godot path

For strategy, RPG, or multi-scene games:

1. Copy `games/galaxy-godot-template/`
2. Use `GalaxyAPI.gd` autoload for save/load/achievements
3. Export with `galaxy_template.html` shell
4. See `docs/godot-game-guide.md`
5. Godot binary available at `.tools/Godot_v4.7-stable_win64.exe`

## Testing

1. Serve via project dev server (`npm run dev` at repo root)
2. Open game at `http://localhost:4321/games/NNN-my-game/index.html`
3. Use browser devtools console for errors
4. Verify save persists after closing and reopening game frame

## External skills (install for better results)

Run these once to upgrade agent game-dev knowledge:

```bash
npx skills add github/awesome-copilot@game-engine -g -y
npx skills add openai/skills@develop-web-game -g -y
npx skills add phaserjs/phaser@game-setup-and-config -g -y
npx skills add anthropics/skills@frontend-design -g -y
npx skills add anthropics/skills@webapp-testing -g -y
npx skills add wshobson/agents@godot-gdscript-patterns -g -y
```

Phaser deep-dive (pick as needed):

```bash
npx skills add phaserjs/phaser@sprites-and-images -g -y
npx skills add phaserjs/phaser@tilemaps -g -y
npx skills add phaserjs/phaser@scale-and-responsive -g -y
```

Visual assets:

```bash
npx skills add omer-metin/skills-for-antigravity@pixel-art-sprites -g -y
```
