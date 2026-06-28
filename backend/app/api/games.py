from fastapi import APIRouter, Header, HTTPException, Response, status

from app.config import settings
from app.schemas.game import GameManifestResponse, SolarSystemInfo
from app.services.game_scanner import (
    games_cache,
    games_list_sorted,
    scan_games,
    scan_generation,
    system_cache,
)

router = APIRouter(prefix="/api/games", tags=["games"])

CACHE_HEADERS = {"Cache-Control": "public, max-age=300"}
CATALOG_HEADERS = {"Cache-Control": "no-store"}


def _rescan_allowed(x_games_rescan_token: str | None) -> bool:
    if settings.debug:
        return True
    token = settings.games_rescan_token.strip()
    return bool(token) and x_games_rescan_token == token


@router.get("/catalog")
async def games_catalog(response: Response):
    """Lightweight catalog version for polling after server-side game adds."""
    response.headers.update(CATALOG_HEADERS)
    return {"generation": scan_generation, "count": len(games_cache)}


@router.get("", response_model=list[GameManifestResponse])
async def list_games(response: Response):
    response.headers.update(CACHE_HEADERS)
    response.headers["ETag"] = f'W/"games-{scan_generation}"'
    return games_list_sorted


@router.get("/systems", response_model=list[SolarSystemInfo])
async def list_systems(response: Response):
    response.headers.update(CACHE_HEADERS)
    response.headers["ETag"] = f'W/"systems-{scan_generation}"'
    return system_cache


@router.post("/rescan")
async def rescan_games(x_games_rescan_token: str | None = Header(None)):
    """Re-scan game manifests from disk (dev workflow or GAMES_RESCAN_TOKEN)."""
    if not _rescan_allowed(x_games_rescan_token):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Rescan requires DEBUG=true or X-Games-Rescan-Token header",
        )
    await scan_games(str(settings.games_path))
    return {"ok": True, "count": len(games_cache), "generation": scan_generation}


@router.get("/{game_id}", response_model=GameManifestResponse)
async def get_game(game_id: str, response: Response):
    game = games_cache.get(game_id)
    if not game:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Game not found")
    response.headers.update(CACHE_HEADERS)
    return game
