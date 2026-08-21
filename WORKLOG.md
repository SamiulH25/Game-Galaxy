# Worklog

## 2026-08-21 (latest) — Last Light implemented (games/006-last-light) + Saltmere Reach system

### Shipped
- **New game `games/006-last-light/`** from `docs/game-specs/last-light.md`: top-down lighthouse guiding arcade. Beam aimed by pointer/touch-drag/arrows; hold (LMB/Space/FOCUS button) to focus — cone ×0.45 narrower, wake memory 2s→4s. Ships wake under the beam and ease toward the beam's aim angle, decaying back to inward drift after wake memory expires. Reef ring with fixed eastern harbor gap (green/red pier lights), randomized Fang rocks that activate safely mid-night as minute-bands escalate (3→5), island wreck. Ship roster per spec: Cog 100 / Messenger Sloop 180 (min 2) / Ember Barge 400 (2.5s cumulative lit) / Ghost Ship (immune while unlit, +150 grace if never lit; lighting it drives it onto your island). Storm surges every ~55–75s: 4s telegraph → 12s wind push + rain + two lightning reveals (0.4s full-lit); clean surge = storm_eye + stormsSurvived. Combo mult cap ×3, storm dock bonus +50, milestones ×5/×8. Three lanterns → dawn ledger report.
- Files: `manifest.json` (10 achievements, icons restricted to star/trophy/bolt/diamond/moon, moons characteristics), `index.html`, `style.css`, `thumbnail.svg`, `js/config|engine|renderer|audio|main.js` — IIFE namespaces (`window.LastLight`), no ES modules, bridge via `../bridge.js`.
- **`games/systems.json`**: added `saltmere` (pale blue-white star per spec §10).
- Keeper's Log (last 8 nights) persisted via bridge save (debounced 800ms) with bestScore/totals/settings/unlocked; PB flare on beat; guest mode runs local-only through the normal bridge timeouts.
- Renderer: additive 3-layer beam cone with dust motes, fog clouds + rim-hiding visibility model (lantern dots always readable, reef ring always traceable), rain/wind/palette shift during storms, reduceFlash setting caps whiteout alpha and skips screen shake; DPR cap 2; pause on blur/visibilitychange/P.

### Verification
- `node --check` all five js files; manifest + systems.json parse clean.
- Engine behavior suite driven in Chromium against the real modules: beam coverage + heading easing (full π swing at turn-rate limits), focused memory armed at exactly 4.0s and expiring, decay to inward drift, normal memory 2s, combo math over 21 docks == closed-form expectation with ×3 cap, storm dock bonus (+50), milestones at 5/8, reef/island wrecks resetting combo + lantern, wreck dirties active storm only, ghost clean exit (+150 exactly, never woke), lit-ghost wreck, storm machine warn→active→lightning→clean credit, wind applied differentially exact to 1e-9 (twin-engine comparison), band changes at 2/4min activating fangs safely (no ship overlap), fog cycling range, third-wreck dawn + recordNight PB/log.
- Live main-loop wiring: overlay hide (fixed missing `#overlay.hidden` rule), body.playing button scoping (FOCUS coarse-pointer only), pointer-move aiming + Space focus through real listeners, event→achievement unlock observed end-to-end (`storm_eye` in meta.unlocked).
- Backend scan (uvicorn + `/api/games/systems`): `[('alpha-centauri', 5), ('saltmere', 1)]`, `006-last-light` in catalog with Beacon Atoll/Saltmere Reach/moons; 6 games total.
- Not exercised: full galaxy-popup launch inside the running frontend stack (backend catalog API verified instead).

### Notes / deviations
- Spec §7 "guest mode saves queue nothing": the game always calls `gameBridge.save()` like its siblings; guest semantics are decided by the shell's GameFrame pending queue (per platform convention).
- Ships steered outward can exit the playfield: removed silently as "lost to open sea" (spec defines no penalty for leaving; scoring makes this non-exploitable).

## 2026-08-21 (later) — All 9 scout findings fixed + galaxy/hero visual rework

### Scout fixes (all 9 deferred findings)

**HIGH — GameFrame save debounce** (`GameFrame.svelte`)
- Debounce window now collects every coalesced bridge `_id` (`pendingSaveIds`) and answers ALL of them on flush — superseded save promises no longer hang until the 5s bridge timeout. Real API errors surface via `parseApiError(err)` instead of a fabricated "save failed".

**HIGH — Central 401 handling** (`api.js`, `auth.ts`)
- `apiFetch` fires an `onAuthExpired` latch (re-armed on fresh login) whenever a request that carried a token gets a 401; the auth store clears token/user and toasts "Session expired". Expired tokens no longer persist silently. Backend `get_current_user_optional` unchanged — submit-score already converts missing user → 401, which now triggers the cue.

**MED — X-Forwarded-For trust** (`security.py`, `config.py`)
- Rate-limit key uses the header only when the direct peer is in new `trusted_proxies` setting (comma-separated, default empty = never trust); then takes the last hop (the one the trusted proxy appended).

**MED — Focus traps** (`utils/focusTrap.ts` + 4 modals)
- Wired the pre-existing `$lib/utils/focusTrap` (already used by AuthModal/PlanetPopup/SidePanel/SystemSelector) into PostGameSummary, AchievementCelebration, ConfirmDialog, KeyboardHelp via `$effect` + `bind:this` — the established pattern, no new action abstraction. Tab can no longer escape these dialogs.

**MED — Personal-best flag** (`leaderboard_service.py`, `schemas/leaderboard.py`, `GameFrame.svelte`)
- `submit_score` now returns `personal_best` (true only when the submission beat the stored entry — the service already refused to clobber worse scores); `ScoreSubmitResponse` carries it; GameFrame uses `result.personal_best === true` instead of flagging PB on any ranked submit.

**MED — GalaxyStatusBar for guests** (`+page.svelte`)
- Rendered unconditionally (self-hides when idle/ready); backend-down on the hero is no longer a silent screen.

**MED — Date-key mismatch** (new `lib/dates.ts`, `galaxy.ts`, `progression.ts`)
- Single source `dateKey()`/`yesterdayKey()` (LOCAL time) shared by streak, daily visit, daily planet, and daily-mission target. Streak and mission now roll over at the player's midnight together.

**LOW — three-scene GPU/interaction** (`three-scene.ts`)
- `sharedSceneTextures` registry: cache-owned textures (planet cache, star dot, glow, mystery label) are skipped by `disposeObject` and freed once in `destroy()`; destroy also disposes the cosmic background texture and clears the planet cache. Fixes cache poisoning on system switches (previously disposeObject freed cached textures, then getPlanetTexture handed them back out).
- `updateStar` reuses the cached sun texture per star color instead of allocating + disposing every switch.
- Asteroid belts are one `InstancedMesh` (shared geometry/material, StaticDrawUsage) instead of per-rock geometry+material pairs; `disposeObject` calls `InstancedMesh.dispose()` for instance buffers.
- Touch/pen `pointerup` sets `suppressClick` so the synthetic click can't double-fire planet actions.

**LOW — Register race + login timing** (`api/auth.py`, `services/auth.py`)
- Register catches `IntegrityError` on commit → 409 (same message as the pre-check path) instead of a 500 on concurrent same-username registration.
- Login verifies against a module-level `DUMMY_PASSWORD_HASH` when the username is unknown — "no such user" and "wrong password" are timing-indistinguishable.

### Bonus: two latent bugs found by actually starting the stack
- `leaderboard_service.py` used `text()` without importing it — backend crashed on boot (part of the previous session's unverified batch).
- My own auth.ts edit had clobbered `logoutUser`, breaking the page with a 500 error boundary — caught by import-probing modules in the browser, restored.

### Visual rework (frontend)
Driven by browser screenshots of hero + galaxy:
- **Uncharted worlds**: the wireframe "mystery veil" made every undiscovered planet look like a broken debug mesh (a guest's entire first galaxy). Replaced with a solid dim body (slate emissive 0x33415e @ 0.18, no translucency) + soft additive BackSide haze shell; hue stays secret until the reveal flare. Idle/hover/reveal/filter emissive paths centralized through `idleEmissiveIntensity()`; the "uncharted only" filter dims charted worlds to 0.45 opacity instead of 0.28 ghosting.
- **Sun**: procedural texture now also feeds `emissiveMap` (granulated disc, not a flat circle); corona texture got a longer soft falloff; inner glow shimmers against the outer pulse. Ambient fill 0.2 → 0.34 so night sides keep detail.
- **Hero**: content left-anchored (≥900px) so the sun is no longer hidden behind the CTA; scrim is a left legibility gradient that lets the galaxy breathe right; title scaled up (clamp max 84px, tighter tracking); tagline became an amber eyebrow with a rule; feature row and CTA group left-aligned; secondary sign-in ghost button contrast raised (and its transparent background restored after an edit slip).

### Verification status
- Backend: all edited modules compile; server boots and `/api/health` is 200.
- Frontend: `tsc --noEmit` clean for `src/`; `npm run build` succeeds.
- Browser (dev stack): hero and galaxy re-rendered and screenshot-verified after the rework; guest entry works; planet bodies/labels/corona render as designed. NOT yet exercised: full guest→launch→save flow, score submit, 401-expiry toast, register 409 race — the deferred functional pass still stands.

## 2026-08-21 — Site review + guest-first cutover + correctness fixes

### Context
Full pass over the site: ran dev stack (FastAPI :8000, Vite :5173), drove the UI in a browser, and ran a read-only code scout (33 findings). Fixed the highest-value items. **Per user instruction: no testing/verification was run for this batch** — browser re-drive and build check are still outstanding.

### Shipped

**Guest mode — play before account** (roadmap pillar #1; previously the entire galaxy was walled behind login)
- `frontend/src/lib/stores/galaxy.ts` — new persisted `galaxyEntered` store (`gg_entered_galaxy`) + `enterGalaxy()`; removed the auth gate from `launchDiscoveredGame` (guests launch games; GameFrame already handles guest saves with soft banners).
- `frontend/src/routes/+page.svelte` — galaxy chrome now shows for `$isAuthenticated || $galaxyEntered`; hero gate keyed off that; sign-out mid-session no longer closes the game.
- `frontend/src/lib/components/HeroPage.svelte` — primary CTA is now **Explore the Galaxy** (was "Sign in to explore"); auth demoted to secondary "Sign in to sync saves"; copy is play-first ("Click any planet to launch — no account needed.").
- `frontend/src/lib/threlte/Scene.svelte` — planet click/double-click/interactions enabled via `canInteract()` = authenticated OR entered-guest.

**Template leak**
- `backend/app/services/game_scanner.py` — manifests with `"starter": true` or `"template"` tag are excluded from the live catalog (the Star Salvage demo planet was live); manifests missing `title` are skipped with a warning instead of crashing the whole scan.
- Catalog verified: 5 games in alpha-centauri (template gone).

**Bug fixes**
- `games/bridge.js` — 5s timeout closure read the shared `_msgId` counter at fire time; with 2+ in-flight requests it resolved/deleted the wrong handler. Now captures its own id.
- `frontend/src/routes/+page.svelte` — `GalaxyToast` was only mounted on the pre-entry hero branch, so rank-up/save/sync toasts were invisible to every signed-in user. Now mounted unconditionally.
- `frontend/src/lib/stores/auth.ts` + `api.js` — session restore cleared the stored token on ANY fetchMe failure (logged users out on timeouts/offline). apiFetch errors now carry `.status`; token is dropped only on 401.
- `frontend/src/lib/stores/progression.ts` — guest pending queue merged all games into one entry whose `gameId` was the last game played → game A's achievements flushed under game B. Queue is now per-game (`PendingGuestSession.games`), flush syncs per game and keeps failed games queued; legacy single-game blobs still read.
- `frontend/src/lib/three-scene.ts` — GPU leaks: `updateStar` replaced the sun texture each call without disposing the old one; switching to an empty system removed planets/rings/labels without `disposeObject`. Both fixed.
- `frontend/src/lib/components/GameFrame.svelte` — removed header Save/Load buttons + handlers: they checked `window.gameBridge`/`__gameSaveData` on the parent window where those never exist, so they always showed "This game does not support saving/loading."
- `backend/app/services/leaderboard_service.py` — submitting score data without a numeric `score` overwrote the user's stored best and reported rank 1; now keeps the stored entry. Insert path catches `IntegrityError` (unique-race) and merges into the winning row.
- `backend/app/services/save_service.py`, `achievement_service.py` — same unique-constraint race guard on first-save / first-unlock.
- `backend/app/models/db.py` — `LeaderboardEntry` model now declares the `uq_lb_game_user` unique constraint (DB already had it via migration 003; metadata was out of sync).

**Cleanup/docs**
- Removed empty orphan dir `games/003-nebula-breaker/` (no files).
- `README.md` — replaced stale hardcoded claims (6 systems / 15 games / systems table listing removed games) with the data-driven reality; documented the `starter` manifest flag.

### Not done (deferred from scout findings — prioritized)
1. **HIGH** GameFrame save debounce answers only the newest `msg._id` — superseded save promises hang until bridge timeout; real API errors swallowed into generic toast.
2. **HIGH** No central 401 handling: expired tokens persist silently; backend `get_current_user_optional` downgrades invalid tokens to anonymous without re-auth cue.
3. **MED** `X-Forwarded-For` trusted unconditionally in `security.py` → rate-limit bypass by header rotation.
4. **MED** Focus trap missing on PostGameSummary / AchievementCelebration / ConfirmDialog / KeyboardHelp (Tab escapes these modals).
5. **MED** Session personal-best flag set on any ranked submit even when the score was worse.
6. **MED** GalaxyStatusBar not rendered for guests → backend-down shows as silent hero.
7. **MED** Date-key mismatch: streak uses local date (`galaxy.ts todayKey`), daily mission uses UTC (`progression.ts getTodayKey`) — disagree near midnight.
8. **LOW** three-scene: destroy() doesn't dispose background/mystery-label textures or planet texture cache; asteroid belts create per-asteroid geometry/materials; touch taps can double-fire planet actions.
9. **LOW** register: concurrent same-username race → 500; no dummy-bcrypt on unknown user (timing enum).

### Verification status
- Guest flow verified in-browser BEFORE this final batch (hero renders, 5-game count correct, template excluded, catalog API clean). The last batch (toast mount, bridge race, leaderboard/service guards, progression queue, GameFrame button removal, README) has **not** been exercised — next session should: restart backend, drive guest→planet→popup→launch→save-banner, submit a score, and run `npm run build`.
