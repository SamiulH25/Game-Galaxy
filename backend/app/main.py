from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.auth import router as auth_router
from app.api.games import router as games_router
from app.api.saves import router as saves_router
from app.api.achievements import router as achievements_router
from app.api.leaderboards import router as leaderboards_router
from app.api.profile import router as profile_router
from app.config import settings
from app.services.game_scanner import games_cache, scan_games
from app.services.universal_achievement_scanner import (
    scan_universal_achievements,
    universal_achievements_cache,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    print(f"Scanning games from {settings.games_dir}...")
    await scan_games(settings.games_dir)
    print(f"Found {len(games_cache)} games")

    await scan_universal_achievements(settings.games_dir)
    print(f"Found {len(universal_achievements_cache)} universal achievements")

    yield


app = FastAPI(title="Game Galaxy 2.0", version="1.0.0", lifespan=lifespan)

# CORS — allows frontend to call API (both dev and production servers)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:4321",
        "http://127.0.0.1:4321",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount game static files
games_path = Path(settings.games_dir).resolve()
if games_path.exists():
    app.mount("/games", StaticFiles(directory=str(games_path)), name="games")

# API routers
app.include_router(auth_router)
app.include_router(games_router)
app.include_router(saves_router)
app.include_router(achievements_router)
app.include_router(leaderboards_router)
app.include_router(profile_router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}


# Mount built frontend in production (must be last — catches all non-API routes)
frontend_dist = Path(__file__).resolve().parent.parent.parent / "frontend" / "build"
if frontend_dist.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="frontend")
