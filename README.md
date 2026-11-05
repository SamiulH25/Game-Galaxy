# Game Galaxy

A 3D galaxy of browser games. Fly between star systems, pick a planet, and play. Every planet is a game.

- **3D galaxy**: a WebGL spiral galaxy. Each star system has orbiting, procedurally shaded planets (terran, rocky, gas giant, ice, lava, ocean), plus rings, moons and atmospheres. A camera fly-through carries you from galaxy to system to planet, and every view has a shareable URL.
- **Play without an account**: guests play straight away, and their progress stays in the browser. When they sign up or sign in, it moves into their account.
- **Accounts, cloud saves, leaderboards and achievements**, all through one small game SDK.
- **Live game folder**: drop a folder into `games/` and its planet appears within seconds. No rebuild or restart.
- **Sandboxed games**: each game runs in an isolated iframe with an opaque origin. Games can't touch the player's session, cookies or the site.

Built with SvelteKit 2 (Svelte 5), TypeScript, Three.js, SQLite (better-sqlite3 + Drizzle) and Zod. It runs as a single Node process.

## The games

| Game | System | What it is |
| --- | --- | --- |
| **Slingshot** | Aurora Drift | Gravity-assist physics. 32 levels verified by simulation, plus an endless Survey mode. |
| **Starward** | Ember Verge | Roguelite deckbuilder: 3 sectors, 35 cards, 16 modules, bosses and 5 Threat levels. |
| **Bastion Ring** | Ember Verge | Tower defense: 4 maps, 6 towers with specialisations, 25-wave campaigns and Endless. |
| **Prism Relay** | Violet Veil | Light-routing puzzles: 50 levels across 5 chapters, plus a daily relay. |
| **Deepcore** | Halcyon Deep | Turn-based roguelike: 10 procedural decks, 8 enemy types, perks, a boss and a daily dive. |

All five are original, written as plain scripts with no build step, and use the Galaxy SDK for saves, leaderboards and 12–13 achievements each.

## Quick start

Requires Node.js 20.19+ (22 LTS recommended).

```bash
npm install
npm run dev
```

Open http://localhost:5173. The database is created automatically in `data/galaxy.db`.

Add your first game from the template:

```bash
npm run new-game -- my-game --title "My Game" --system aurora
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Production build into `build/` |
| `npm start` | Run the production build (`node build`) |
| `npm run check` | Type-check Svelte and TypeScript |
| `npm test` | Unit tests (Vitest) |
| `npm run new-game -- <id>` | Scaffold `games/<id>/` from `templates/game/` |
| `npm run db:generate` | Generate a migration after editing `src/lib/server/db/schema.ts` |
| `npm run schemas` | Regenerate `schemas/*.json` after editing the manifest schema |

## How it fits together

```
games/                    ← content: one folder per game + systems.json (served live from disk)
templates/game/           ← starter game copied by `npm run new-game`
static/sdk/galaxy.js      ← the SDK games include: <script src="/sdk/galaxy.js">
src/
  hooks.server.ts         ← session cookie → locals.user, API origin guard, security headers
  lib/
    galaxy/               ← Three.js scene, shaders, pure layout maths
    bridge/               ← host side of the SDK (postMessage), guest localStorage store
    components/           ← UI components
    server/               ← database, auth, catalog scanner, progress (saves/scores/achievements)
  routes/
    +page.svelte          ← the galaxy
    library/              ← searchable 2D list of every game (also the no-WebGL fallback)
    game/[id]/            ← game details, leaderboard, achievements
    play/[id]/            ← the player: sandboxed iframe + SDK host
    login/ signup/ logout/ me/
    api/                  ← JSON API used by the player
    g/[id]/[...path]/     ← serves game files from GAMES_DIR
drizzle/                  ← SQL migrations (applied automatically on start)
schemas/                  ← JSON Schemas for game.json / systems.json (editor autocomplete)
tests/                    ← unit tests
```

**How a game talks to the site.** The player page loads the game in an iframe with `sandbox="allow-scripts …"` and no `allow-same-origin`. Game HTML is also served with a CSP `sandbox` header, so a game opened directly in a tab is isolated too. The game calls `Galaxy.save()`, `Galaxy.submitScore()` and so on. The SDK posts those requests to the player, which stores them:
- for a signed-in player, through the API;
- for a guest, in `localStorage`.

The game never sees a token.

**Accounts.** Passwords are hashed with scrypt. Sessions are random tokens in an `HttpOnly` `SameSite=Lax` cookie; the database stores only their SHA-256. Sessions last 30 days and renew as you play. Login and signup are rate-limited. API writes need `application/json` and a same-origin `Origin`.

## Adding games

See **[docs/GAMES.md](docs/GAMES.md)**, which covers:
- the `game.json` reference;
- the SDK API;
- planet appearance;
- leaderboards and achievements;
- testing your game.

## Deploying

See **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** for Node, Docker and reverse-proxy setups, plus backups. In short:

```bash
npm ci && npm run build
ORIGIN=https://galaxy.example.com PORT=3000 node build
```

or

```bash
ORIGIN=https://galaxy.example.com docker compose up -d --build
```
