# Deployment

Game Galaxy is one Node.js process (SvelteKit's `adapter-node`). It serves the site, the API and the game files, and it keeps everything in one SQLite file.

## Environment

| Variable | Default | Purpose |
| --- | --- | --- |
| `ORIGIN` | — | **Required in production.** The public URL, e.g. `https://galaxy.example.com`. SvelteKit uses it for CSRF checks on sign-in forms. |
| `PORT` / `HOST` | `3000` / `0.0.0.0` | Where to listen. |
| `DATABASE_PATH` | `./data/galaxy.db` | SQLite file. It's created and migrated on start. |
| `GAMES_DIR` | `./games` | Folder of games and `systems.json`. Read live. |
| `GAMES_RESCAN_SECONDS` | `10` (`2` in dev) | How often the catalog checks for changed games. |
| `ADDRESS_HEADER` | — | Behind a proxy, e.g. `X-Forwarded-For`, so rate limits see real client IPs. |
| `XFF_DEPTH` | `1` | How many proxies sit in front, when `ADDRESS_HEADER=X-Forwarded-For`. |

## Plain Node

```bash
npm ci
npm run build
ORIGIN=https://galaxy.example.com node build
```

Only `build/`, `drizzle/`, `node_modules/` (production deps), `package.json` and your `games/` folder are needed at runtime.

A systemd unit:

```ini
[Unit]
Description=Game Galaxy
After=network.target

[Service]
WorkingDirectory=/opt/game-galaxy
Environment=ORIGIN=https://galaxy.example.com
Environment=PORT=3000
Environment=ADDRESS_HEADER=X-Forwarded-For
ExecStart=/usr/bin/node build
Restart=on-failure
User=galaxy

[Install]
WantedBy=multi-user.target
```

## Docker

```bash
ORIGIN=https://galaxy.example.com docker compose up -d --build
```

The compose file:
- keeps the database in the `galaxy-data` volume;
- bind-mounts `./games`, so you can add or edit games on the host without rebuilding.

To freeze the games into the image instead, remove that mount; the image already contains `games/` at build time.

## Reverse proxy

Terminate TLS in nginx or Caddy and proxy to the app. Cookies are marked `Secure` automatically when `ORIGIN` is `https://`.

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    client_max_body_size 1m;
    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml application/wasm;
}
```

## Backups

Everything players own is in the SQLite file (`DATABASE_PATH`). Take a consistent copy while the server runs with:

```bash
sqlite3 data/galaxy.db ".backup 'galaxy-$(date +%F).db'"
```

## Health check

`GET /api/health` returns `{ "ok": true, "games": n, "systems": n }`.
