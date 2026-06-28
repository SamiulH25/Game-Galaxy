import json

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.db import User
from app.schemas.save import SaveDataPut, SaveDataResponse
from app.services.auth import get_current_user
from app.services.game_scanner import games_cache
from app.services.save_service import get_save, upsert_save
from app.validators import validate_save_data

router = APIRouter(prefix="/api/saves", tags=["saves"])


def _safe_parse_save_data(raw: str) -> dict:
    """Parse save data JSON safely — returns empty dict on corruption."""
    if not raw or raw == "null":
        return {}
    try:
        return json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        return {}


@router.get("/{game_id}")
async def load_save(
    game_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if game_id not in games_cache:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Game not found")

    save = await get_save(db, current_user.id, game_id)
    if not save:
        return None
    return SaveDataResponse(
        id=save.id,
        game_id=save.game_id,
        save_data=_safe_parse_save_data(save.save_data),
        created_at=save.created_at,
        updated_at=save.updated_at,
    )


@router.put("/{game_id}", response_model=SaveDataResponse)
async def save_data(
    game_id: str,
    body: SaveDataPut,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if game_id not in games_cache:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Game not found")

    validate_save_data(body.save_data)
    save = await upsert_save(db, current_user.id, game_id, body.save_data)
    return SaveDataResponse(
        id=save.id,
        game_id=save.game_id,
        save_data=_safe_parse_save_data(save.save_data),
        created_at=save.created_at,
        updated_at=save.updated_at,
    )
