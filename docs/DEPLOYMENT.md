# Deployment

Game Galaxy runs as **one process** in production: FastAPI serves the built SvelteKit site, `/api/*`, and `/games/*` together.

## Requirements

| Tool | Version | Used for |
|------|---------|----------|
| **Node.js** | 18+ | Frontend build & setup scripts |
| **Python** | 3.11+ | API server |
| **npm** | 9+ | Frontend dependencies |

Optional: **Docker** 24+ for container deploy (no local Python/Node needed on the server).

---

## Fastest path (any OS with Node + Python)

```bash
git clone <your-repo> game-galaxy
cd game-galaxy
npm run setup          # venv, pip, .env, migrations, npm install
npm run start:prod     # build frontend + start on PORT (default 4321)
```

**Shortcuts:** `./setup.sh` (Linux/macOS) or `setup.bat` (Windows) — same as `npm run setup`.

Open **http://localhost:4321**

First-time setup also works on Windows PowerShell — same commands.

### Configure

Edit `backend/.env` (created from `backend/.env.example`):

```env
SECRET_KEY=<random-64-char-hex>
HOST=0.0.0.0
PORT=4321
DATABASE_URL=sqlite+aiosqlite:///./game_galaxy.db
GAMES_DIR=../games
```

Generate a secret:

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

---

## Docker (Linux / Windows Server / cloud)

No local Python or Node required on the host.

```bash
cp .env.example .env    # set SECRET_KEY
docker compose up --build -d
```

- Site: **http://localhost:4321**
- SQLite DB persisted in Docker volume `game-galaxy-data`
- **`./games` is bind-mounted** — add or edit games on the host without rebuilding (see [SERVER-DEV.md](./SERVER-DEV.md))

Rebuild after **frontend/backend** changes:

```bash
docker compose up --build -d
```

Scaffold a new game on the server:

```bash
npm run new-game -- my-game --title "My Game"
```

---

## Windows (PowerShell helpers)

Legacy scripts still work:

```powershell
npm run setup
npm run start:prod        # cross-platform Node script (recommended)
# or
npm run start:prod:ps1    # original PowerShell script
```

Dev mode with hot reload:

```powershell
npm run start:dev
```

---

## Linux (systemd example)

After `npm run setup:build`:

```ini
# /etc/systemd/system/game-galaxy.service
[Unit]
Description=Game Galaxy 2.0
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/game-galaxy/backend
EnvironmentFile=/opt/game-galaxy/backend/.env
ExecStart=/opt/game-galaxy/backend/venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 4321
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Ensure `frontend/build` exists (`npm run build` from repo root).

---

## Reverse proxy (HTTPS)

Point nginx/Caddy at `http://127.0.0.1:4321`. Example nginx location:

```nginx
location / {
    proxy_pass http://127.0.0.1:4321;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

If the public URL differs from localhost, set in `backend/.env`:

```env
CORS_ORIGINS=https://games.example.com
```

---

## Health check

```bash
curl http://localhost:4321/api/health
```

Returns `hosting.mode: "unified"` when the frontend build is present.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `Virtualenv not found` | Run `npm run setup` |
| `frontend/build` missing | Run `npm run build` or `npm run start:prod` |
| Games 404 | Check `GAMES_DIR` in `.env`; folder must contain `*/manifest.json` |
| Port in use | Change `PORT` in `backend/.env` |
| Default SECRET_KEY warning | Set a real `SECRET_KEY` before going public |

---

## Architecture note

**Development** uses two processes (Vite :5173 + API :8000 with proxy).

**Production** uses one process (uvicorn on `PORT`) — simpler for VPS, Docker, and Windows IIS reverse-proxy setups.
