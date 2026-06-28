# Game Galaxy 2.0

A 3D galaxy of playable HTML games. Explore solar systems, click planets, and play games with persistent cloud saves.

Built with **Python FastAPI + SvelteKit + Three.js**. Each solar system has a unique star with distinct color and lighting, and every game sits on its own procedurally-generated planet with visual characteristics (rings, moons, atmospheres, asteroid belts).

## Quick Start

**Prerequisites:** Node.js 18+, Python 3.11+

```bash
npm run setup          # first time: venv, deps, .env, DB migrations
npm run start:prod     # build + serve everything on http://localhost:4321
```

On Windows you can also double-click **`setup.bat`**.

**Docker (no local Python/Node on server):**

```bash
cp .env.example .env   # set SECRET_KEY
docker compose up --build
```

Full details: **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** — Linux systemd, Windows, reverse proxy, troubleshooting.

**Server-side game dev** (SSH, Cursor CLI, live `games/` hosting): **[docs/SERVER-DEV.md](docs/SERVER-DEV.md)**

### Development (hot reload)

Both services need to run together:

```bash
npm run setup
npm run dev
```

Open **http://localhost:5173** (Vite proxies `/api` and `/games` to the backend on :8000).

<details>
<summary>Manual dev setup (two terminals)</summary>

### Terminal 1 — Backend
```bash
cd backend
python -m venv venv
# Windows: venv\Scripts\activate  |  Linux: source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

### Terminal 2 — Frontend
```bash
cd frontend
npm install
npm run dev
```
</details>

### Legacy Windows scripts
```powershell
npm run start:dev      # dev with logs
npm run start:prod:ps1 # production (PowerShell)
```

## Features

- **3D galaxy** — Procedural starfield, orbiting planets, cinematic camera, dynamic lighting per solar system
- **6 solar systems** — Each with unique star color, emissive glow, and ambient lighting
- **15 playable games** — Action, puzzle, strategy, idle, arcade across all systems
- **Procedural planets** — Noise-based terrain textures, colored by manifest, with rings, moons, atmosphere shells, and asteroid belts
- **Cloud saves** — Per-user, per-game save/load via JWT-authenticated API
- **Auth** — Register/login with username/password, bcrypt hashing, JWT tokens
- **Game bridge** — Games communicate with the shell via `postMessage` for save/load

## API Reference

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/health` | — | Health check |
| `POST` | `/api/auth/register` | — | Create account (username 3-32 chars, password 6-128 chars) |
| `POST` | `/api/auth/login` | — | Returns `{access_token, token_type}` |
| `GET` | `/api/auth/me` | Bearer | Current user info |
| `GET` | `/api/games` | — | All game manifests, sorted by title |
| `GET` | `/api/games/systems` | — | Solar systems with game counts and star properties |
| `GET` | `/api/games/catalog` | — | Catalog generation + count (for live reload polling) |
| `GET` | `/api/games/{game_id}` | — | Single game manifest by folder name |
| `POST` | `/api/games/rescan` | `X-Games-Rescan-Token` (or `DEBUG=true`) | Re-scan manifests from disk |
| `GET` | `/api/saves/{game_id}` | Bearer | Load save data |
| `PUT` | `/api/saves/{game_id}` | Bearer | Upsert save data |

Static routes: `/games/{game_id}/index.html` serves game files directly.

## Adding a Game

Create a folder in `/games/` with a `manifest.json` and `index.html`:

```
games/
  my-game/
    manifest.json
    index.html
    assets/
```

### manifest.json

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | yes | Display name |
| `description` | string | yes | Shown in planet popup |
| `planetName` | string | yes | Label on the 3D planet |
| `solarSystemId` | string | yes | Matches a key in `systems.json` |
| `solarSystemName` | string | yes | Display name for the system |
| `planetColor` | string | yes | Hex color for procedural texture |
| `planetSize` | number | yes | Sphere radius |
| `orbitRadius` | number | yes | Distance from sun |
| `orbitSpeed` | number | yes | Orbital angular velocity |
| `tags` | string[] | — | Categories: `action`, `puzzle`, `strategy`, `arcade`, `idle`, `casual`, etc. |
| `thumbnail` | string | — | Path to thumbnail SVG |
| `characteristics` | object | — | Planet visual features (see below) |

### Planet Characteristics

**Rings** (Saturn-like):
```json
{ "type": "rings", "ringColor": "#e8d8a0", "ringWidth": 0.8, "ringOpacity": 0.6, "ringCount": 3 }
```

**Moons:**
```json
{ "type": "moons", "moonCount": 2, "moonSize": 0.18, "moonOrbitRadius": 2.3, "moonColor": "#8888aa" }
```

**Atmosphere:**
```json
{ "type": "atmosphere", "atmoColor": "#4488ff", "atmoIntensity": 0.5 }
```

**Asteroid Belt:**
```json
{ "type": "asteroidBelt", "beltColor": "#665544", "beltOpacity": 0.5, "beltCount": 40, "beltWidth": 0.6 }
```

### Game Bridge

Include `<script src="../bridge.js"></script>` in your game's `index.html`. The bridge provides:

```js
// Save game state (data is JSON-serializable)
window.gameBridge.save({ score: 100, level: 5 });

// Load previously saved state (returns null if no save exists)
const data = await window.gameBridge.load();
```

The bridge communicates with the shell via `postMessage`. No other API or DOM access is needed.

### Solar Systems

| ID | Name | Star Color | Star Size | Games |
|----|------|-----------|-----------|-------|
| `alpha-centauri` | Alpha Centauri | `#ffcc44` (warm yellow) | 2.0 | Asteroid Blaster, Space Pong, Bauhaus Tetris |
| `sirius` | Sirius | `#aaccff` (cool blue) | 1.6 | Cosmic Clicker, Washi Mosaic |
| `andromeda` | Andromeda | `#ff88cc` (pink) | 2.4 | Memory Constellation, Gravity Runner, Root & Ribbon |
| `orion` | Orion | `#ff6644` (red-orange) | 2.8 | Star Forge, Nebula Puzzle, Midnight Alchemist |
| `lyra` | Lyra | `#44ffaa` (green) | 1.8 | Quantum Shift, Cosmic Harvest, Paper Drift |
| `vega` | Vega | `#ffffff` (white) | 1.4 | Solar Defender |

Star properties are configured in `games/systems.json`.

## Project Structure

```
├── backend/                  # Python FastAPI server
│   ├── alembic/              # DB migrations (users, game_saves)
│   ├── app/
│   │   ├── api/              # Route handlers (auth, games, saves, achievements, leaderboards, profile)
│   │   ├── models/           # SQLAlchemy models
│   │   ├── schemas/          # Pydantic request/response schemas
│   │   ├── services/         # Business logic (auth, scanner, saves)
│   │   ├── config.py         # Env-based settings
│   │   ├── database.py       # Async SQLite engine + session
│   │   └── main.py           # FastAPI app + CORS + lifespan
│   └── requirements.txt
├── frontend/                 # SvelteKit SPA
│   ├── src/
│   │   ├── lib/
│   │   │   ├── components/   # Svelte components (PlanetPopup, GameFrame, AuthModal, HeroPage, SidePanel, etc.)
│   │   │   ├── stores/       # Svelte stores (auth, galaxy, settings, social)
│   │   │   ├── threlte/      # Three.js scene integration
│   │   │   ├── api.js        # API client with JWT token injection
│   │   │   ├── audio.ts      # Web Audio API sound synthesizer (17 sounds)
│   │   │   └── three-scene.ts # GalaxyScene class — full Three.js 3D engine
│   │   ├── routes/           # SvelteKit routes (+page.svelte, +layout.svelte, account/)
│   │   ├── app.css           # Design tokens and global styles
│   │   └── app.html          # HTML shell
│   ├── svelte.config.js      # Adapter-static with SPA fallback
│   └── vite.config.ts        # Vite config (SvelteKit plugin, API proxy)
├── games/                    # Game folders with manifest.json + index.html
│   ├── bridge.js             # postMessage save/load shim for games
│   ├── systems.json          # Star visual configuration per solar system
│   ├── 001-asteroid-blaster/
│   ├── 002-space-pong/
│   ├── ...
│   └── 015-root-and-ribbon/
└── Things to add/            # Staging area for games not yet integrated
```

## Architecture

- **Backend**: FastAPI with async SQLite (AIOSQLite). Game manifests and system config are scanned from disk at startup and cached in memory — no rebuild needed when adding games.
- **Frontend**: Single-page Astro site. Three.js renders the 3D scene with procedural planets, dynamic lighting, and cinematic camera orbit. The scene rebuilds when switching solar systems.
- **Auth**: Username/password with bcrypt hashing. JWT tokens stored in `localStorage`. The auth modal toggles between login and register.
- **Save system**: Each user has one save blob per game (JSON text). The frontend sends/receives saves via the API, and games access them through the `postMessage` bridge.
- **Planet rendering**: Procedural canvas textures with multi-octave noise, latitude bands, craters, and surface spots. Characteristics (rings, moons, atmosphere, asteroid belt) are applied per manifest.
