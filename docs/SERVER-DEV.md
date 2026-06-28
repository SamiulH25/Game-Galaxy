# Server-side game development

Develop new games **on the host** (SSH, Cursor CLI, any editor) and have Game Galaxy pick them up **without rebuilding** the site.

## How it works

| Layer | Behavior |
|-------|----------|
| **`games/` on disk** | Each game is `games/NNN-slug/` with `manifest.json` + `index.html` |
| **Static hosting** | `/games/NNN-slug/index.html` is served live from disk |
| **`GAMES_WATCH`** | Backend rescans manifests every few seconds when files change |
| **Galaxy UI** | Polls `/api/games/catalog` and adds new planets automatically (~15s) |
| **Docker** | `./games` is bind-mounted into the container |

You only rebuild the Docker image when you change the **frontend** or **backend** — not when adding games.

---

## Quick start (Docker on a VPS)

```bash
git clone <your-repo> game-galaxy
cd game-galaxy
cp .env.example .env          # set SECRET_KEY
docker compose up --build -d
```

Defaults in `docker-compose.yml`:

- `./games` → `/app/games` (live mount)
- `GAMES_WATCH=true`
- `GAMES_LIVE_RELOAD=true` (no-cache game assets — refresh iframe to see JS/CSS edits)

Open the site, then on the server:

```bash
npm run new-game -- asteroid-rush --title "Asteroid Rush"
```

The new planet appears in the galaxy within ~15 seconds (or immediately at `/games/002-asteroid-rush/index.html`).

---

## Quick start (bare metal / systemd)

```bash
npm run setup
# Edit backend/.env — enable:
#   GAMES_WATCH=true
#   GAMES_LIVE_RELOAD=true
npm run start:prod
```

---

## CLI commands

| Command | Purpose |
|---------|---------|
| `npm run new-game -- <slug>` | Copy `000-template-game` → `games/NNN-slug/`, patch manifest, rescan |
| `npm run games:rescan` | Force manifest rescan (after hand-editing `manifest.json`) |

Options for `new-game`:

```bash
npm run new-game -- my-game --title "My Game" --system alpha-centauri
npm run new-game -- my-game --url https://games.example.com
npm run new-game -- my-game --no-rescan
```

---

## Cursor CLI / SSH workflow

1. SSH into the server (or use Cursor Remote SSH).
2. `cd` to the repo — games live under `games/`.
3. Scaffold: `npm run new-game -- working-title`
4. Edit files in `games/NNN-working-title/` (or point Cursor agent at that folder).
5. Test in browser: `https://your-host/games/NNN-working-title/index.html`
6. When `manifest.json` is valid, the planet joins the galaxy automatically.

**Agent tip:** The template at `games/000-template-game/` and skill `.cursor/skills/game-galaxy-games/SKILL.md` document the expected layout (`config.js`, `engine.js`, `renderer.js`, `main.js`, `../bridge.js`).

---

## Manual game layout

Minimum to be hosted:

```
games/026-my-game/
  manifest.json    # required for galaxy listing
  index.html       # entry point (include <script src="../bridge.js"></script>)
```

`manifest.json` must include at least: `title`, `description`, `planetName`, `solarSystemId`, `solarSystemName`, `planetColor`, `planetSize`, `orbitRadius`, `orbitSpeed`.

Folder name = game ID (e.g. `026-my-game`).

---

## Environment variables

In `backend/.env` (or Docker `environment`):

| Variable | Default | Purpose |
|----------|---------|---------|
| `GAMES_DIR` | `../games` | Path to games root |
| `GAMES_WATCH` | `false` (true in Docker compose) | Auto-rescan on manifest changes |
| `GAMES_WATCH_INTERVAL` | `3` | Seconds between polls |
| `GAMES_LIVE_RELOAD` | `false` (true in Docker compose) | No-cache `/games/*` assets |
| `GAMES_RESCAN_TOKEN` | empty | Allows `POST /api/games/rescan` when `DEBUG=false` |
| `DEBUG` | `false` | Also enables rescan without token |

Generate a rescan token:

```bash
python -c "import secrets; print(secrets.token_hex(16))"
```

Then call:

```bash
curl -X POST -H "X-Games-Rescan-Token: <token>" https://your-host/api/games/rescan
```

---

## Staging / backups

Only **top-level** folders with `manifest.json` are listed:

- `games/001-forge-line/` — live
- `games/_backup/old-game/` — **not** scanned (safe archive)

Move a game from `_backup/` to `games/` when ready to publish.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Game URL works but no planet | Check `manifest.json` is valid JSON at `games/<id>/manifest.json` |
| Planet still missing | Run `npm run games:rescan` or wait for `GAMES_WATCH` |
| Old JS after edit | `GAMES_LIVE_RELOAD=true` or hard-refresh iframe |
| Rescan 403 | Set `DEBUG=true` or `GAMES_RESCAN_TOKEN` |
| Docker shows old games | Ensure `./games` volume mount is present in `docker-compose.yml` |

---

## Production note

For a **frozen** production deploy (no live edits), remove the `./games` volume from `docker-compose.yml` and set `GAMES_WATCH=false` — games ship inside the image at build time.
