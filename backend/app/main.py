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
from app.game_host import FrontendStaticFiles, GameStaticFiles, resolve_games_directory
from app.security import SecurityHeadersMiddleware
from app.services.game_scanner import games_cache, scan_games
from app.services.game_watcher import start_games_watch, stop_games_watch
from app.services.universal_achievement_scanner import (
    scan_universal_achievements,
    universal_achievements_cache,
)

# Resolved once at import — stable regardless of process CWD
GAMES_PATH = resolve_games_directory(settings.games_dir, Path(__file__).resolve().parent.parent)
FRONTEND_DIST = settings.frontend_dist_path

if (
    not settings.debug
    and settings.using_default_secret
    and FRONTEND_DIST.exists()
):
    raise RuntimeError(
        "SECRET_KEY is still the default. Set a real SECRET_KEY in backend/.env before production."
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Game Galaxy hosting:")
    print(f"  games_dir: {GAMES_PATH} ({'found' if GAMES_PATH.exists() else 'MISSING'})")
    print(f"  frontend:  {FRONTEND_DIST} ({'found' if FRONTEND_DIST.exists() else 'not built'})")

    await scan_games(str(GAMES_PATH))
    print(f"  scanned:   {len(games_cache)} game(s)")

    await scan_universal_achievements(str(GAMES_PATH))
    print(f"  universal: {len(universal_achievements_cache)} achievement(s)")

    if settings.games_watch:
        start_games_watch(str(GAMES_PATH), settings.games_watch_interval)

    if settings.using_default_secret:
        print("  WARNING: SECRET_KEY is still the default — set a real key in backend/.env for production")

    yield

    await stop_games_watch()


app = FastAPI(
    title="Game Galaxy 2.0",
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
    openapi_url="/openapi.json" if settings.debug else None,
)

app.add_middleware(SecurityHeadersMiddleware)

# CORS for split dev mode (Vite on :5173 → API on :8000 without proxy fallback)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Game static files (/games/*) ─────────────────────────────────────────────
# Must be registered BEFORE the frontend catch-all mount.
if GAMES_PATH.exists():
    app.mount(
        "/games",
        GameStaticFiles(
            directory=str(GAMES_PATH),
            dev_mode=settings.debug or settings.games_live_reload,
        ),
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
    if settings.debug:
        return {
            "status": "ok",
            "hosting": {
                "mode": "unified" if FRONTEND_DIST.exists() else "api-only",
                "games_dir": str(GAMES_PATH),
                "games_dir_exists": GAMES_PATH.exists(),
                "frontend_built": FRONTEND_DIST.exists(),
                "game_count": len(games_cache),
            },
        }
    return {"status": "ok"}


# ── Frontend SPA (production) — MUST be last ─────────────────────────────────
if FRONTEND_DIST.exists():
    app.mount(
        "/",
        FrontendStaticFiles(directory=str(FRONTEND_DIST), html=True),
        name="frontend",
    )
