from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import router as auth_router
from app.api.games import router as games_router
from app.api.saves import router as saves_router
from app.api.achievements import router as achievements_router
from app.api.leaderboards import router as leaderboards_router
from app.api.profile import router as profile_router
from app.config import settings
from app.game_host import GameStaticFiles, resolve_games_directory
from app.services.game_scanner import games_cache, scan_games
from app.services.universal_achievement_scanner import (
    scan_universal_achievements,
    universal_achievements_cache,
)

# Resolved once at import — stable regardless of process CWD
GAMES_PATH = resolve_games_directory(settings.games_dir, Path(__file__).resolve().parent.parent)
FRONTEND_DIST = settings.frontend_dist_path


@asynccontextmanager
async def lifespan(app: FastAPI):
    print(f"Game Galaxy hosting:")
    print(f"  games_dir: {GAMES_PATH} ({'found' if GAMES_PATH.exists() else 'MISSING'})")
    print(f"  frontend:  {FRONTEND_DIST} ({'found' if FRONTEND_DIST.exists() else 'not built'})")

    await scan_games(str(GAMES_PATH))
    print(f"  scanned:   {len(games_cache)} game(s)")

    await scan_universal_achievements(str(GAMES_PATH))
    print(f"  universal: {len(universal_achievements_cache)} achievement(s)")

    yield


app = FastAPI(title="Game Galaxy 2.0", version="2.0.0", lifespan=lifespan)

# CORS for split dev mode (Vite on :5173 → API on :8000 without proxy fallback)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        f"http://{settings.host}:{settings.port}",
        f"http://localhost:{settings.port}",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Game static files (/games/*) ─────────────────────────────────────────────
# Must be registered BEFORE the frontend catch-all mount.
if GAMES_PATH.exists():
    app.mount(
        "/games",
        GameStaticFiles(directory=str(GAMES_PATH), dev_mode=settings.debug),
        name="games",
    )
else:
    print(f"WARNING: games directory not found at {GAMES_PATH} — /games will 404")

# ── API ──────────────────────────────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(games_router)
app.include_router(saves_router)
app.include_router(achievements_router)
app.include_router(leaderboards_router)
app.include_router(profile_router)


@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "hosting": {
            "mode": "unified" if FRONTEND_DIST.exists() else "api-only",
            "games_dir": str(GAMES_PATH),
            "games_dir_exists": GAMES_PATH.exists(),
            "frontend_built": FRONTEND_DIST.exists(),
            "game_count": len(games_cache),
            "play_url_pattern": "/games/{game_id}/index.html",
        },
    }


# ── Frontend SPA (production) — MUST be last ─────────────────────────────────
if FRONTEND_DIST.exists():
    from fastapi.staticfiles import StaticFiles

    app.mount(
        "/",
        StaticFiles(directory=str(FRONTEND_DIST), html=True),
        name="frontend",
    )
