# Emberforge — Full Game Spec

**Genre**: Arcade blacksmithing / management + timing
**Setting**: A cozy fantasy village forge (stone, timber, thatch, warm lantern light)
**Platform**: Game Galaxy 2.0 — HTML game, single iframe, no ES modules
**Status**: Spec complete — implementation follows this document

---

## 1. Vision

**One-sentence pitch**: You are the village blacksmith of Ember Hollow — heat ingots, strike them at the perfect moment, and quench them into masterworks, all against a burning fuel clock.

**Design pillars**
1. **Simple to learn, deep to master** — three phases, one input language (bellows hold, hammer tap, quench tap). Mastery comes from reading heat momentum and risk/reward timing.
2. **Arcade tension, cozy warmth** — the fuel clock and melting heat keep every run urgent, but the scene — embers, warm lanterns, a crackling firebox — keeps it inviting. Contrast is the mood.
3. **The collection is the reward** — every ingot is kept, named, graded, and displayed on a personal forge rack. You play to grow your rack.
4. **Everything around it matters** — commissions, upgrades, materials, achievements, and leaderboards are the reason to forge again.

**Win condition**: Complete the **Crown Commission** (forge a Legendary Mythril crown piece) after completing all story commissions. Beatable, with an endgame.

**Lose condition**: Melt the ingot (overheat) or run out of fuel. Run ends — you keep whatever grade you earned and any coin.

---

## 2. Core loop

Each run = one ingot, three phases, one score.

### Phase 1 — Heat
- The ingot sits cold in the firebox. Hold **Bellows** (Space / tap-and-hold) to raise temperature.
- Temperature rises with **momentum**: release, and heat drifts down (the fire cools).
- Fuel burns continuously while heating — faster at higher temps. Fuel = lives.
- If temp exceeds the material's **melt point** → ingot melts → run over.
- Risk/reward: white-hot edge zone (above the working window) grants a **White-Hot bonus** multiplier on strike accuracy, but burns fuel much faster and risks melt.

### Phase 2 — Strike (Shaping)
- Entered automatically when temp is inside the material's **working window** (and stays until window left).
- A **hammer marker** sweeps left↔right across a timing band. Tap to strike.
- Strike accuracy = distance from the marker to the band's **peak**:
  - **Perfect** (within tight inner band) → max shape progress, combo +1
  - **Good** (within mid band) → reduced progress, combo preserved
  - **Miss** (outside band, or band empty) → no progress, combo resets, fuel penalty
- Every strike consumes a small fuel tick and slightly heats the metal (hammer energy).
- Combo multiplies shape progress and feeds the final score.
- The ingot **visually deforms** as strikes land — flat bar → blade profile → finished shape. Each material has a distinct target silhouette.
- Strike until **shape meter is full** → auto-advance to Quench.

### Phase 3 — Quench
- The quench trough is ready. A **narrow timing window** appears and **shrinks over ~2.5s**.
- Tap at the correct instant to drop the ingot:
  - **Perfect quench** (temp in ideal range, timing in inner band) → highest grade tier, "Masterwork" potential
  - **Good quench** → middle tier
  - **Early/Late or wrong temp** → brittleness/warp penalty, tier drops
- Quench is a single high-stakes decision that can save a sloppy run or sink a perfect one.

### Run end
- After quench, the ingot is **graded**, named, **kept** in the collection rack, and sold for **coin** (based on grade).
- Score = grade value × combo peak × speed bonus. Submitted to leaderboard.
- Next commission, or forge freely.

---

## 3. Materials (difficulty ladder)

Unlock order via commissions. Each has distinct heat behavior.

| Material | Working window | Melt point | Heat momentum | Behavior | Unlock |
|---|---|---|---|---|---|
| **Iron** | 820–980°C | 1200°C | Steady, predictable | None | Start |
| **Bronze** | 950–1100°C | 1300°C | Slightly faster | None | Commission 2 |
| **Steel** | 1050–1200°C | 1400°C | Narrow window | Random **exothermic spikes** (+30–80°C) | Commission 4 |
| **Mythril** | 1150–1300°C | 1500°C | Very fast, drifts | **Danger spikes** (+60–120°C) that can melt you | Commission 8 (final) |

- **White-hot edge**: the zone between window top and melt point. Entering it grants the White-Hot bonus multiplier (×1.5 to ×2.0 strike accuracy) but burns fuel 2–3× faster and risks melt.
- Temperatures are display-scale (fictional) — balancing target is: Iron is approachable, Mythril is a real skill check.

---

## 4. Grading & scoring

### Grades (each ingot)
| Grade | Requirements |
|---|---|
| **Rusted** | Quench failed badly (wrong temp / late) |
| **Crude** | Low accuracy, rushed heat |
| **Serviceable** | Solid mid run |
| **Fine** | Good accuracy + decent quench |
| **Masterwork** | ≥80% average accuracy + perfect quench |
| **Legendary** | ≥90% average accuracy + perfect quench + White-Hot strikes used |

### Score formula (submitted to leaderboard)
```
base = grade_value (Rusted 100 → Legendary 1000)
combo_peak_mult = 1 + combo_peak × 0.05   (cap ×3)
speed_bonus = max(0, time_grace − elapsed) × 0.5
score = round(base × combo_peak_mult + speed_bonus)
```
- `time_grace` = 60s per material tier (Iron 60, Bronze 75, Steel 90, Mythril 105). Faster = more points.
- Leaderboard: **best single-ingot score** (auto-submit on quench).

---

## 5. Meta progression

### Coin economy
- Selling each ingot grants coin by grade: Rusted 5, Crude 10, Serviceable 20, Fine 40, Masterwork 100, Legendary 250.
- Coin persists via save. Used to buy upgrades (below).

### Upgrades (purchased with coin, persist)
| Upgrade | Cost | Effect |
|---|---|---|
| **Bellows Mk II** | 60 | Heat rate +25% |
| **Bellows Mk III** | 150 | Heat rate +25% (total +50%) |
| **Cooling Fins** | 100 | Quench window +0.3s grace |
| **Fuel Efficiency** | 120 | Fuel burn −20% |
| **Anvil Resonance** | 200 | Perfect-strike window +15% |
| **Master's Hammer** | 400 | Combo decay slower (combo breaks on 2 misses instead of 1) |

### Commissions (story campaign — win condition)
Progression-gated requests from villagers, each with material + target grade. Completing one unlocks the next.

| # | Commission | Material | Target | Reward |
|---|---|---|---|---|
| 1 | "A plow blade for Farmer Bram" | Iron | Fine | 30 coin + Bronze unlock |
| 2 | "Bronze buckles for the caravan" | Bronze | Fine | 45 coin |
| 3 | "Steel horseshoes for the stables" | Steel | Serviceable | 60 coin |
| 4 | "A Fine steel cookpot for the tavern" | Steel | Fine | 75 coin |
| 5 | "Masterwork steel heirloom for the Elder" | Steel | Masterwork | 120 coin |
| 6 | "Mythril dagger for the Watch Captain" | Mythril | Fine | 150 coin |
| 7 | "The Crown's scepter — Legendary Mythril" | Mythril | **Legendary** | 400 coin + **WIN** |

- Free-forge mode (no commission) always available for practice / leaderboard chasing.
- On completing the final commission → **victory screen** ("The Crown is yours — Ember Hollow celebrates"). Game is beatable.

### Collection (persistent rack)
- Every forged ingot is added to the rack: `"Bronze · Fine · Day 3"` plus material icon, grade, date.
- Player can **name** Masterwork+ ingots (free-text, saved).
- Rack is the persistent visual reward — the "surrounding" that makes the loop worth repeating.

---

## 6. Achievements (per-game, manifest)

| id | Title | Trigger | Icon |
|---|---|---|---|
| `first_ingot` | First Spark | Forge any first ingot | flame |
| `grade_fine` | Solid Work | Forge a Fine ingot | hammer |
| `masterwork` | Master's Touch | Forge a Masterwork | star |
| `legendary` | Legendary Smith | Forge a Legendary | diamond |
| `combo_10` | Steady Rhythm | Reach a 10-strike combo | bolt |
| `white_hot` | White-Hot Dare | Use the White-Hot bonus zone | fire |
| `one_each` | Armory | Forge one of each material | shield |
| `ingots_25` | Hearth Warrior | Forge 25 ingots total | anvil |
| `ingots_100` | Emberlord | Forge 100 ingots total | crown |
| `commission_master` | The Crown | Complete the final commission | trophy |

---

## 7. Save data (via bridge)

```json
{
  "version": 1,
  "coins": 0,
  "upgrades": { "bellows": 0, "coolingFins": 0, "fuelEff": 0, "anvil": 0, "hammer": 0 },
  "materials": ["iron"],
  "commissions": { "current": 0, "completed": [] },
  "collection": [
    { "name": "Bronze · Fine · Day 3", "material": "bronze", "grade": "Fine", "date": "2026-08-04", "customName": "" }
  ],
  "totals": { "forged": 0, "perfectStrikes": 0, "bestScore": 0 },
  "gameComplete": false
}
```

- Loaded on boot; saved on boot (merge) and after every major event (quench, sale, purchase, commission complete).
- Debounced save; guest mode → save data returns null, game runs local-only.

---

## 8. Audio (procedural Web Audio)

| Event | Sound |
|---|---|
| Bellows push | Low airy whoosh (filtered noise) |
| Heat climb | Rising subtle rumble |
| Perfect strike | Bright metallic clink (high sine + short ring) |
| Good strike | Duller thunk |
| Miss | Hollow thud |
| Melt | Harsh descending scrape + sizzle |
| Quench perfect | Loud sizzle + steam hiss + chime |
| Quench fail | Dull clunk |
| Coin / sale | Gentle chime |
| Achievement | Sparkle arpeggio |
| Menu click | Soft tick |
| Win | Warm fanfare (chord arpeggio) |

---

## 9. Visual design (top priority)

- **Palette**: deep charcoal/indigo shadows, warm ember orange (#ff6b35), molten gold (#ffb347), white-hot core, cool cyan quench trough (#7ec8e3), stone greys, wood browns, thatch golds.
- **Scene (side-on)**: stone forge hearth with firebox, animated ember particles rising, bellows on the left, anvil center with ingot, quench trough right, timber rafters, hanging lanterns (soft glow), a window showing the village dusk.
- **Ingot color = feedback**: cold grey → cherry red → orange → yellow → white (melt warning). Glow intensifies with temp.
- **Hammer**: swings with motion trail; sparks burst on strike; screen shake on hard hits.
- **HUD**: arcade top bar (SCORE / FUEL / GRADE) with bold condensed display font (Bebas Neue), warm accent. Overlays: title → heat intro → strike intro → quench intro → result (graded + sold) → next commission.
- **Fonts**: Google Fonts — **Bebas Neue** (display), **Exo 2** (body), Rajdhani (labels). (Consistent with galaxy family but warmer weight.)
- **Mobile**: touch bellows (hold), strike (tap anywhere on anvil), quench (tap trough). Large targets, no browser-default buttons anywhere.
- **No ES modules** — IIFE namespaces (`window.Emberforge = window.Emberforge || {}`), `<script src>` tags.

---

## 10. File layout

```
games/NNN-emberforge/
  manifest.json
  index.html
  style.css
  thumbnail.svg
  js/
    config.js     # materials, phases, tuning, names, grades, upgrades
    engine.js     # pure game state, heat momentum, strikes, quench, grading, economy
    renderer.js   # canvas scene (forge, embers, ingot, hammer, particles)
    audio.js      # procedural Web Audio
    main.js       # loop, input, HUD, overlays, bridge, screen flow
```

---

## 11. Testing & validation checklist

- [ ] Serve via dev server; open `/games/NNN-emberforge/index.html`
- [ ] Title → heat → strike → quench → result flow works end-to-end
- [ ] Melt and fuel-empty lose conditions both trigger
- [ ] Quench perfect vs. fail changes grade
- [ ] Combo increments/resets correctly; White-Hot bonus applies
- [ ] Coin/upgrades/commissions persist across reload (save/load bridge)
- [ ] Achievements fire once each; leaderboard score submits on quench
- [ ] Mobile touch controls work; canvas resizes; no console errors
- [ ] Final commission → victory screen

---

## 12. Out of scope (v1)

- Multiple simultaneous commissions
- Multi-ingot "batch" forging
- Seasonal/limited materials
- Multiplayer forge
