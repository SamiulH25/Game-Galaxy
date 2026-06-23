from fastapi import APIRouter, HTTPException, status

from app.schemas.game import GameManifestResponse, SolarSystemInfo
from app.services.game_scanner import games_cache, system_cache

router = APIRouter(prefix="/api/games", tags=["games"])


@router.get("", response_model=list[GameManifestResponse])
async def list_games():
    return sorted(games_cache.values(), key=lambda g: g["title"])


@router.get("/systems", response_model=list[SolarSystemInfo])
async def list_systems():
    return system_cache


@router.get("/{game_id}", response_model=GameManifestResponse)
async def get_game(game_id: str):
    game = games_cache.get(game_id)
    if not game:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Game not found")
    return game
