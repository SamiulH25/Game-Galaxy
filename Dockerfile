# ── Stage 1: build SvelteKit frontend ─────────────────────────────────────────
FROM node:20-bookworm-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci 2>/dev/null || npm install
COPY frontend/ ./
RUN npm run build

# ── Stage 2: Python API + static hosting ──────────────────────────────────────
FROM python:3.12-slim-bookworm
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

COPY backend/ /app/backend/
COPY games/ /app/games/
COPY --from=frontend-build /app/frontend/build /app/frontend/build

ENV DATABASE_URL=sqlite+aiosqlite:////app/data/game_galaxy.db \
    GAMES_DIR=/app/games \
    HOST=0.0.0.0 \
    PORT=4321 \
    DEBUG=false

RUN mkdir -p /app/data && chmod +x /app/backend/docker-entrypoint.sh

VOLUME ["/app/data"]
EXPOSE 4321

WORKDIR /app/backend
ENTRYPOINT ["/app/backend/docker-entrypoint.sh"]
