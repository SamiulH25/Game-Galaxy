# Last Light — Full Game Spec

**Genre**: Atmospheric arcade / guiding puzzle (aim-and-lead)
**Setting**: A fog-drowned coast at night — you are the keeper of the last lighthouse above a reef graveyard
**Platform**: Game Galaxy 2.0 — HTML game, single iframe, no ES modules
**Status**: Spec complete — implementation follows this document

---

## 1. Vision

**One-sentence pitch**: Ships drift blind through fog toward the reef — your lighthouse beam is the only compass they trust, and you have three lanterns to keep burning until dawn.

**Design pillars**
1. **One input, constant judgment** — everything is the beam: where it points, when to focus it. Mastery is reading fog, wind, and ship lanes while never stopping the sweep.
2. **The dark is the antagonist** — fog hides rocks and ships alike; storms steal visibility. Tension comes from what you *can't* see.
3. **Every rescue feels physical** — ships visibly wake under the beam (lantern flares, bow swings), follow your light with momentum, and slide into the harbor gap with a bell and foam. Feedback is the reward.
4. **Short nights, long obsession** — a run is 2–5 minutes, endlessly replayable, scored, and leaderboard-bound.

**Win condition**: None (arcade endless). A night **ends** when your third lantern goes out (three wrecks). Dawn report = score, docks, wrecks, best combo. Beating your personal best *is* the win.

**Lose condition**: Third wreck. The sea takes the light.

---

## 2. Core loop

Top-down circular sea. The lighthouse sits on a rock islet at the **center**. A reef ring (rocks) circles the playfield with exactly **one gap** — the **harbor channel**, fixed at due **east** (0 rad), marked by two pier lights (green north side / red south side, real lighthouse vernacular).

### The beam
- A cone of light from the lighthouse, aimed by pointer (mouse position sets the angle; touch drag sets it relative).
- **Focus** (hold mouse button / Space / on-screen button on touch):
  - Cone width ×0.45, brightness up
  - **Wake memory** extended: ships stay obedient longer after leaving the beam
  - Tradeoff: narrow cone catches fewer ships at once

### The ships
- Spawn at the outer rim inside fog, drifting slowly **inward** (toward the reef/island) on a heading with slight wobble. They cannot see anything.
- **Light-seeking (the core rule)**: while a ship is inside the beam, its heading eases toward the **beam's current aim angle** (not toward the lighthouse). After leaving the beam, it keeps steering that way for **wake memory** (2.0s normal, 4.0s focused), decaying back to its slow inward drift.
- So the loop is: **sweep across a ship → rotate ahead to the harbor gap → hold the beam on the gap** until the ship commits. Multiple ships can be chained if the cone catches several.

### The hazards
- **Reef ring**: rocks around the rim except the harbor gap. Ship touches rock → **wreck**.
- **The Fangs**: 3–5 inner rocks scattered between the reef and the island (randomized each night). Same rule.
- **The island itself**: a ship that reaches the center without docking wrecks on the lighthouse rock.
- **Fog walls**: fog density cycles (thick ↔ thin). In thick fog ships render later (spawn hidden until closer) and the reef barely renders.

### Storm surge (every ~55–75s, telegraphed 4s ahead)
- Wind vector pushes all drifting/lit ships sideways for ~12s.
- Rain streaks + darker palette.
- **Lightning flash**: for 0.4s the whole scene renders fully lit — every rock and every ship visible. Skilled players use flashes to re-plan.

### Night end
- 3 lanterns (= lives). Each wreck snuffs one: bell toll, foam burst, screen shudder. Third wreck → **dawn**: sky pales, fog lifts, result panel.

---

## 3. Ships (difficulty ladder)

| Ship | Behavior | Wake need | Points | Appears |
|---|---|---|---|---|
| **Cog** | Standard, slow, forgiving | Instant | 100 | From start |
| **Messenger Sloop** | Fast, small, tight turning | Instant | 180 | Minute 2+ |
| **Ember Barge** | Slow, wide, heavy momentum; needs **2.5s cumulative** lit time to wake | 2.5s cumul. | 400 | Minute 4+ |
| **Ghost Ship** | Ignores your beam normally and drifts straight, passing reefs harmlessly, then leaves. **If you shine the beam on it, it wakes — and steers toward the lighthouse island.** Let it pass, or kill your own light. | Don't. | 0 (it can't dock) | Watch 3+ |

**Night escalation** (continuous, minute-banded):

| Band | Spawn interval | Fog ceiling | Fangs | Notes |
|---|---|---|---|---|
| 0–2 min | 7.0s | thin | 3 | Cogs only, tutorial pace |
| 2–4 min | 5.5s | cycling | 4 | Sloops join |
| 4–6 min | 4.5s | cycling, thicker | 5 | Barges join; storms stronger |
| 6+ min | 3.5s | thick bias | 5 | Everything, faster drift, windier storms |

---

## 4. Scoring (submitted to leaderboard)

```
dock_points   = ship.points × combo_mult
combo_mult    = 1 + 0.1 × (combo − 1)        (cap ×3.0)
combo         = +1 per dock, resets on any wreck
storm_bonus   = +50 per dock during an active storm surge
ghost_grace   = +150 if a ghost ship visits AND is never lit
score         = Σ(dock_points + storm_bonus) + ghost_grace
```

- Leaderboard: **best single-night score** (`submitScore` at dawn).
- Daily-mission calibration: average night ≈ 18–30 docks ≈ **2,200–4,600 pts** — sits correctly inside the shell's daily target range (500–4,500).

---

## 5. Meta progression (lean by design)

No coin economy — this game's meta is mastery plus the log:

- **Keeper's Log** (persistent): the last 8 nights — date, docks, wrecks, best combo, score, storms survived. Rendered as handwritten ledger lines on the title/result screens. This is the collection.
- **Personal best** shown on title & HUD; beaten PB gets a dawn flare + distinct sound.
- Everything else is achievements + leaderboard.

---

## 6. Achievements (per-game, manifest)

Icons restricted to the shell's supported set: `star`, `trophy`, `bolt`, `diamond`, `moon`.

| id | Title | Trigger | Icon |
|---|---|---|---|
| `first_dock` | Harbor Bell | Dock your first ship | star |
| `ten_docks` | Steady Watch | Dock 10 ships in one night | trophy |
| `barge_in` | Heavy Rescue | Dock an Ember Barge | diamond |
| `storm_eye` | Storm Eye | Survive a storm surge with no wreck | bolt |
| `combo_8` | Chain of Light | Reach combo ×8 | bolt |
| `ghost_pass` | Look Away | Let a Ghost Ship pass without ever lighting it | moon |
| `sloop_five` | Fast Post | Dock 5 Messenger Sloops in one night | star |
| `clean_fifteen` | Lantern Keeper | Dock 15 before your first wreck | trophy |
| `saved_25` | 25 Souls | Dock 25 ships total (lifetime) | diamond |
| `legend_keeper` | Last Light | Score ≥ 5,000 in one night | trophy |

---

## 7. Save data (via bridge)

```json
{
  "version": 1,
  "bestScore": 0,
  "totals": { "nights": 0, "docks": 0, "wrecks": 0, "bestCombo": 0, "stormsSurvived": 0 },
  "log": [
    { "date": "2026-08-21", "docks": 22, "wrecks": 2, "bestCombo": 9, "score": 3480 }
  ],
  "settings": { "reduceFlash": false, "showBeamHint": true }
}
```

- Loaded on boot via `gameBridge.load()`; merged over defaults.
- Saved (debounced 800ms) after: night end, settings toggle.
- Guest mode: `load()` returns null → run local-only; saves still queue nothing (this game has no pending-progress concept — simply don't persist).
- `submitScore({ score: finalScore })` once at dawn. Achievements via `unlockAchievement(id)` — fire-once guarded locally too.

---

## 8. Audio (procedural Web Audio)

| Event | Sound |
|---|---|
| Ambient bed | Filtered brown-noise surf, slow LFO; foghorn swell (low detuned saws) every ~20s, quieter in menus |
| Ship wakes | Soft lantern blip (short sine ping, pitch by ship type) |
| Beam over ship | Gentle rising shimmer while lit |
| Dock | Harbor bell (FM bell, two partials) + foam hiss |
| Wreck | Low boom + noise splash; lantern-out fizzle |
| Storm warn | Rising wind gust + low rumble |
| Lightning | Cracked noise burst + 0.4s high-pass whiteout hiss |
| Combo milestone (×5, ×8) | Two-note brass-ish hit |
| Ghost near | Detuned music-box figure, quiet, only while ghost on screen |
| Dawn | Pale major chord pad |
| Achievement | Sparkle arpeggio |
| UI click | Soft tick |

Master gain modest; mute respects page-level audio unlock (games run in iframe — init AudioContext on first pointer/key input).

---

## 9. Visual design (top priority)

- **Palette**: ink navy sea (#081226 → #0a1428 radial), fog grey-blue (#8fa3bd at 10–35% alpha), **beam amber** (#e8a838, matches the site accent), pier lights green (#57c785) / red (#e06a5a), foam white (#e8f0f8), rock charcoal (#1b2030), slate emissive for uncharted bodies (#33415e).
- **Scene (top-down)**: lighthouse islet center (white tower, animated rotating lamp room), concentric reef ring with the eastern harbor gap framed by two pier lights, scattered Fang rocks each with slow foam rings, ships = small hull polygons with lantern dot + short wake trail, beam = additive gradient cone with soft edge falloff and dust motes drifting in it, fog = large soft radial clouds drifting across, storm = slanted rain streaks + palette shift + lightning whiteout frames.
- **Readability rules**: the beam must always be the brightest thing on screen; rocks always get a faint foam outline even in thick fog (fairness); ships always show a lantern dot even unlit.
- **HUD**: top-left SCORE (Bebas Neue, amber), top-center lantern ×3 icons (snuff animation on wreck), combo chip appears mid-screen-top on ×2+, storm banner slides in on warn, dawn result panel = ledger-style card (docks, wrecks, combo, storms survived, score, PB delta) + `Play again`.
- **Fonts**: Google Fonts — **Bebas Neue** (display/score), **Exo 2** (body). Consistent with the galaxy family.
- **Mobile**: drag anywhere = aim (delta-based, no jump), on-screen **FOCUS** button bottom-right, pause button top-left. Canvas resizes with devicePixelRatio cap 2.
- **No ES modules** — IIFE namespaces (`window.LastLight = window.LastLight || {}`), `<script src>` tags.

---

## 10. File layout

```
games/006-last-light/
  manifest.json      # incl. achievements[], characteristics, new system ref
  index.html
  style.css
  thumbnail.svg
  js/
    config.js     # tuning: beam, wake memory, ships, fog/storm bands, scoring
    engine.js     # pure sim: beam math, ship steering/wake, collisions, waves, scoring
    renderer.js   # canvas: sea, fog, beam cone, ships, rocks/foam, weather, HUD
    audio.js      # procedural Web Audio
    main.js       # loop, input (mouse/touch/keys), overlays, bridge, screen flow
```

**manifest.json**
```json
{
  "title": "Last Light",
  "description": "Keep the lighthouse burning — sweep your beam to guide fog-lost ships past the reef and into harbor.",
  "planetName": "Beacon Atoll",
  "solarSystemId": "saltmere",
  "solarSystemName": "Saltmere Reach",
  "planetColor": "#0e3a4a",
  "planetSize": 0.85,
  "orbitRadius": 13.5,
  "orbitSpeed": 0.05,
  "starter": false,
  "characteristics": {
    "type": "moons",
    "moonCount": 1,
    "moonSize": 0.16,
    "moonOrbitRadius": 2.1,
    "moonColor": "#9fb4c4"
  },
  "achievements": [ ...as §6... ]
}
```

**systems.json addition** (new system — derive-from-manifests means adding both):
```json
"saltmere": {
  "name": "Saltmere Reach",
  "starColor": "#cfe3ff",
  "starEmissive": "#aebfd8",
  "glowColor": "#9fc4e8",
  "ambientColor": "#101a2e",
  "glowIntensity": 0.9,
  "starSize": 2.1
}
```
(Pale blue-white star — a cold sea-light, deliberately unlike Alpha Centauri's warm amber.)

---

## 11. Testing & validation checklist

- [ ] Serve via dev server; open `/games/006-last-light/index.html` standalone AND via galaxy popup launch
- [ ] Title → how-to → night → dawn result flow works end-to-end
- [ ] Beam aiming: mouse, keyboard (arrows rotate, Space focus), touch (drag aims; FOCUS button works)
- [ ] Ships wake under beam, follow beam angle, obey wake-memory decay; focused vs normal memory differ measurably
- [ ] Dock through the harbor gap scores; rock/island contact wrecks; 3 wrecks → dawn result
- [ ] Sloop/barge/ghost behaviors match §3 (barge cumulative-lit counter; ghost punishes being lit)
- [ ] Storm surge: telegraph → wind push → lightning reveals rocks; storm dock bonus applies
- [ ] Combo increments on dock, resets on wreck, cap ×3 verified in score math
- [ ] Save/load via bridge persists bestScore/log/settings; guest mode runs local-only without errors
- [ ] Achievements fire once each (shell toast/celebration); dawn submits leaderboard score exactly once
- [ ] Pause on tab blur; canvas resize/DPR clean; no console errors; reduced-motion path skips shakes/whiteouts

## 12. Out of scope (v1)

- Multiple harbors / selectable gap angle
- Editable or procedurally "seeded" reef layouts shared via link
- Weather beyond storm surge (rain-only drizzle, snow)
- A second lighthouse / co-op keeper
- Cosmetic lenses & tower skins
