# Game Galaxy 2.0 — UX Product Roadmap

A user-experience-first plan for making the galaxy feel intuitive, rewarding, and worth coming back to.

**North star:** A player should feel like an *explorer* — curious at first, competent within 60 seconds, proud after each session, and motivated to return.

**Design principle:** Rewards only matter when users *see* and *feel* them. Features hidden on `/account` or in APIs don’t count as UX.

---

## Who we’re designing for

| Persona | Goal | Biggest fear |
|---------|------|----------------|
| **Curious visitor** | Try something fun in under a minute | “Is this just a tech demo?” |
| **Casual player** | Play a few games, maybe come back tomorrow | “I’ll lose my progress” |
| **Completionist** | Beat everything, climb ranks, collect badges | “I don’t know what’s left to do” |

One shell must serve all three without overwhelming the first-time visitor.

---

## The ideal journey (target state)

```
Land → Understand → Pick a planet → Preview game → Play → Win/lose → Celebrate → Choose next
  ↑                                                                                    ↓
  └──────────────────── Return later (save synced, streak, new planet highlighted) ────┘
```

**60-second rule:** From first paint to gameplay, a new visitor should be *in a game* without reading docs or creating an account.

---

## Current UX audit (honest)

### What works
- Beautiful 3D galaxy — strong first impression
- Planet popup → launch flow is clear once you’re past the hero
- Game frame + bridge pattern is invisible when it works
- Account page has achievements and leaderboards (for users who find it)

### Friction & broken promises

| Moment | What user expects | What happens today |
|--------|-------------------|-------------------|
| Hero landing | “Click a planet to begin” | Galaxy was blocked behind overlay (fixed); sign-in still competes with play CTA |
| Hero CTAs | Play first | Both buttons open auth — visitor can’t play without dismissing hero another way |
| First planet click | Open game or preview | No guided handoff; popup appears with no “you’re here now” moment |
| During game | Saves “just work” | Save/load pops auth modal mid-game — jarring context switch |
| Win / achievement | Celebration | Small toast; easy to miss |
| Close game | “How did I do?” | Confirm dialog or silent exit — no summary, no next step |
| After session | See progress | Progress lives in Side Panel / Account — not in the play loop |
| Returning user | Resume where I left off | No “continue” or “last played” on galaxy |

These are **experience bugs**, not missing backends. Most fixes are shell UI + copy + timing.

---

## UX pillars (use these to judge every change)

1. **Play before account** — Auth is for *keeping* progress, not *starting* fun.
2. **One obvious next action** — Every screen answers: “What do I click now?”
3. **Celebrate small wins** — First game, first save, first achievement, personal best — all deserve a moment.
4. **Progress is visible in the galaxy** — Not buried in settings or account tabs.
5. **Consistent sci-fi console voice** — UI, copy, and sound feel like one product (per project taste).
6. **Respect focus** — No sidebar on landing; no auth modal over active gameplay unless user chose to save.

---

## Phase 1 — First session that converts (UX priority)

*Outcome: Visitors become players. Players understand saves without a lecture.*

### 1.1 Landing & onboarding
- [ ] **Primary CTA = Play** — “Explore as guest” or animated hint: click any planet (auth secondary: “Save progress”)
- [ ] **First planet click** — Dismiss hero, gentle camera nudge toward clicked planet, open planet popup
- [ ] **3-step micro-coach** (once only): `Click planet` → `Launch` → `Sign in anytime to save` — skippable, no wall of text
- [ ] **Fix copy mismatches** — Hero, popup, and scroll hint all say the same thing

### 1.2 Planet popup as the “store page”
Users decide to play here. Treat it like a product page, not a debug panel.

- [ ] **Above the fold:** title, genre, difficulty, ~time to beat, one screenshot
- [ ] **Social proof:** “124 players this week” or top 3 scores (even anonymous)
- [ ] **Personal context (if signed in):** “Your best: 4,200” / “Last played: yesterday”
- [ ] **Single primary button:** LAUNCH — everything else secondary

### 1.3 Play session UX
- [ ] **Guest play** — Full play without account; saves stay local until sign-in (or clearly “session only”)
- [ ] **Defer auth** — On save/load, soft banner: “Sign in to keep this” instead of hard modal over game
- [ ] **Loading state** — Named progress in game frame (“Loading Crystal Nexus…”) not blank iframe
- [ ] **Escape / close** — Consistent: Esc closes popup; in-game close shows summary first (see 1.4)

### 1.4 Session end (the most neglected moment)
- [ ] **Post-game summary card** — Score, win/lose, time played, achievements unlocked this session
- [ ] **Emotional beat** — Win: celebration + sound. Loss: “Try again” + tip, not empty dismiss
- [ ] **Next action chips** — `Play again` · `Another game in this system` · `View leaderboard`
- [ ] **Achievement unlock** — Full-width modal overlay (not corner toast): icon, name, “+1 toward Explorer”

**Phase 1 success (UX metrics)**
- Time to first game launch &lt; 60s (guest)
- ≥50% of first sessions launch ≥2 games
- Auth modal during gameplay &lt; 10% of sessions (deferred to summary)

---

## Phase 2 — Return visits feel personal (retention UX)

*Outcome: Coming back feels like continuing a story, not starting over.*

### 2.1 Galaxy as home screen
- [ ] **Welcome back strip** — “Welcome back, {name} · 2-day streak · 3/15 games explored”
- [ ] **Continue card** — Last played game with one-click launch
- [ ] **Undiscovered planets** — Subtle dim + “?” until first visit; satisfying reveal on first launch
- [ ] **System progress ring** — Orbit HUD: “Alpha Centauri 4/6” without opening Side Panel

### 2.2 Progress without grind jargon
Avoid “XP” until users care. Use explorer language:

- [ ] **Explorer rank** — Cadet → Voyager → Admiral (tied to games played + wins, shown on profile chip)
- [ ] **Galaxy journal** — Collectible log: planets visited, achievements, personal bests
- [ ] **Milestone toasts in galaxy** — “New system unlocked” when journal threshold hit

### 2.3 Daily rhythm (optional, light touch)
- [ ] **Today’s planet** — One highlighted world + “Daily challenge” badge (no FOMO dark patterns)
- [ ] **Streak as warmth** — “You’ve played 3 days in a row” on return, not guilt

**Phase 2 success**
- D7 return rate uplift
- “Continue” card used in ≥30% of return sessions

---

## Phase 3 — Mastery & social proof (depth UX)

*Outcome: Completionists and competitive players see a reason to stay months.*

### 3.1 Leaderboards in context
- [ ] Planet popup + post-game summary show rank — not only `/account`
- [ ] “You moved up 4 places” after score submit
- [ ] Filter: Friends later; for now global + personal best line

### 3.2 Discovery & recommendation
- [ ] “If you liked X, try Y” on summary screen (tag-based)
- [ ] Filter galaxy by genre/difficulty in Side Panel (when chrome is visible)
- [ ] Search result highlights planet in scene

### 3.3 Accessibility & device UX
- [ ] Mobile: planet popup full-screen sheet, touch targets ≥44px
- [ ] Reduce motion setting respects hero animations
- [ ] Keyboard map on help overlay (`Esc`, `S` save, system switch)

**Phase 3 success**
- Leaderboard views per session ↑
- Account page no longer the only place users see achievements

---

## Phase 4 — Living galaxy (long-term UX)

- [ ] Seasonal visual pass on one system (visitor sees “something changed”)
- [ ] Limited-time achievements with clear end date in journal
- [ ] Share link: “Beat my score on Neon Siege” → lands on planet popup pre-selected
- [ ] New games announced via journal notification, not changelog

---

## Information architecture (where things should live)

| User question | Answer should be here | Not here |
|---------------|------------------------|----------|
| What can I play? | Galaxy + planet popup | Account page |
| How am I doing? | Post-game summary + galaxy HUD | Side Panel only |
| What’s left to explore? | Galaxy journal / dimmed planets | Achievements tab alone |
| Who’s winning? | Planet popup + post-game | Buried leaderboard tab |
| Settings / audio / FPS | Side Panel → Settings | — |
| Account / sign out | Title bar auth | — |

**Rule:** If it affects motivation to play, it must appear in the **galaxy → play → summary** loop.

---

## Copy & tone guide

- **Voice:** Calm command center — confident, short, not cute
- **Buttons:** Verbs — `Launch`, `Continue`, `Save progress`, not `Submit`
- **Errors:** Human — “Couldn’t reach the server. Your local progress is safe.”
- **Auth:** Benefit-first — “Sign in to sync saves across devices” not “Register required”

---

## Recommended UX sprints (revised)

### Sprint 1 — “Play first” (highest impact)
1. Guest-first hero: secondary auth, planet click dismisses hero
2. Planet popup content hierarchy (difficulty, time, launch)
3. Post-game summary card with next-action chips
4. Achievement celebration modal (replace easy-to-miss toast)

### Sprint 2 — “Come back”
1. Welcome back strip + continue last game
2. Undiscovered planet visual state
3. Deferred auth pattern for save (banner, not modal-in-game)

### Sprint 3 — “Explore more”
1. Leaderboard snippet on popup + summary
2. Galaxy journal / system progress
3. Ship 1–2 polished games from `Things to add/` (content supports UX promises)

### Sprint 4 — “Find it in the galaxy” ✅
*Outcome: Discovery is a deliberate moment in the 3D view — menus catalog, the galaxy unlocks.*

1. **Discovery rules** — Starter worlds playable on day one; everything else unlocks only by clicking its planet in the scene
2. **Galaxy nudge** — Locked picks show hint bar + switch system + camera focus
3. **Planet focus** — Search Enter / journal / nudge pans camera and pulses target world
4. **Share links** — `?planet=024-paper-drift&challenge=1200` opens popup with challenge banner; Share button copies link
5. **What’s new** — Journal tab badge + NEW pills for games added since last visit

### Sprint 5 — “Play anywhere” ✅
1. Mobile planet popup as full-screen bottom sheet, touch targets ≥44px
2. Reduce motion setting (honors OS preference) — hero, reveal, focus, transitions
3. Keyboard help overlay (`?` button + `Esc` / `S` / `[` `]` shortcuts)
4. Live search highlights planet in galaxy (debounced, exact/single-prefix match)

### Sprint 6 — “Command center complete” ✅
*Outcome: The shell feels finished — reliable offline feedback, touch-ready galaxy, polished account hub.*

1. **Galaxy load state** — loading banner + offline error with retry (`GalaxyStatusBar`)
2. **Centralized API errors** — `parseApiError` + global toasts (`GalaxyToast`)
3. **Account leaderboards** — loads on tab open, formatted scores, `?tab=leaderboards&game=` deep links from post-game summary
4. **Touch galaxy** — pointer events on 3D scene (tap planets on mobile)
5. **GameFrame polish** — iframe timeout/error UI, in-app close confirm, mobile header targets
6. **Auth UX** — ProfileCard opens modal (not dead-end redirect), submit spinner + parsed errors
7. **Explorer rank** — Cadet → Galaxy Master from discovery %, shown in welcome bar
8. **Daily planet** — deterministic UTC highlight in welcome bar with camera focus

**Phase 4 (living galaxy)** — seasonal system pass, limited-time achievements — still deferred.

### Sprint 7 — “Close the loop” ✅
1. Guest session queue → sync score & achievements on sign-in
2. Daily mission target wired to popup, welcome bar, and post-game summary
3. Planet popup: social proof, local/cloud bests, how-to-play excerpt

### Sprint 8 — “Chart the sky” ✅
1. Rank-up and system-charted toasts on discovery milestones
2. Journal personal bests per game
3. Challenge win/loss recorded from share links

### Sprint 9 — “Cockpit” ✅
1. Game frame fullscreen + live session timer
2. Pinch/wheel zoom + recenter button on galaxy
3. UI scale setting now applies to document root
4. “Uncharted” filter highlights unknown worlds in 3D

### Sprint 10 — “Broadcast” ✅
1. OG/meta tags + PWA manifest
2. Dynamic page title when playing or previewing
3. `/about` privacy & data page + footer link

### Sprint 11 — “Season zero” ✅
1. Nebula Drift seasonal theme (CSS + journal countdown)
2. Challenge history in journal
3. Replay onboarding tour from settings

---

## What we’re explicitly not doing yet

- Complex economy / currencies (adds cognitive load)
- Forcing account before first game
- Gating entire solar systems behind paywalls or heavy grind
- Feature sprawl in Side Panel during first session

---

## Technical hooks (for implementers only)

| UX feature | Existing code to extend |
|------------|-------------------------|
| Post-game summary | `GameFrame.svelte`, `showGame` store |
| Achievements UI | `AchievementToast.svelte`, `unlockAchievement` in bridge |
| Planet popup | `PlanetPopup.svelte`, manifest fields |
| Onboarding state | `hasPlayedGame`, `HeroPage.svelte`, `+page.svelte` |
| Profile / stats | `ProfileCard.svelte`, `profile_service.py` |
| Leaderboards | `loadLeaderboard`, `account/+page.svelte` |

---

## How to use this doc

1. Pick a **sprint** above.
2. For each item, ask: *Which persona benefits? Which journey step? How do we measure it?*
3. Ship UX changes in the shell before adding new backend systems.
4. New games must pass the **planet popup test**: Would a stranger know why to click Launch?
