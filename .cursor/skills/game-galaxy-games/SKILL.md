---
name: game-galaxy-games
description: >-
  Build games for Game Galaxy 3. Use when creating, editing, or porting games in games/,
  writing game.json manifests, or wiring saves, scores and achievements through the Galaxy SDK.
---

# Game Galaxy — building games

Full reference: `docs/GAMES.md`. Starter: `templates/game/` (copy with `npm run new-game -- <id>`).

## Contract

- A game is `games/<id>/` with `game.json` + `index.html`. The folder name is the id (lowercase, digits, dashes).
- Include the SDK with `<script src="/sdk/galaxy.js"></script>` and use the global `Galaxy`:
  `ready()`, `load()`, `save(json)`, `submitScore(n)`, `unlock(id)`, `achievements()`, `on('pause'|'resume'|'settings', fn)`.
- `submitScore` needs `"scoring"` in game.json; `unlock(id)` needs the id in `"achievements"`.
- Games run sandboxed (opaque origin): **no localStorage/IndexedDB/cookies/alert**. Persist only via `Galaxy.save`.
- Files are served live from disk; new games appear in the galaxy within seconds.

## Quality bar

1. Original design with a clear goal, end state and reason to replay (score, progression, unlocks).
2. Mouse + touch + keyboard. Canvas sized to the viewport, `devicePixelRatio` capped at 2.
3. Pause on `Galaxy.on('pause')`; respect `settings.muted` and `settings.reducedMotion`.
4. Save meaningful progress; submit a score at natural end points; 6–12 achievements incl. a few secret ones.
5. No build step. Plain `<script>` files (IIFE/namespace pattern) or one bundled file.
6. Visual language: dark space backgrounds, one confident accent, legible type, smooth feedback.

## Checklist before shipping

- [ ] `game.json` validates (server logs `[catalog]` errors otherwise; `schemas/game.schema.json` for autocomplete)
- [ ] Plays end-to-end at `/play/<id>`; save survives a reload; score + achievements fire once
- [ ] Works at 390×844 (touch) and 1440×900 (mouse/keyboard)
- [ ] No console errors
