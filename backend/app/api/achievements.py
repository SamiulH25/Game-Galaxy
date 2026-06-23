from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services.auth import get_current_user
from app.models.db import User
from app.schemas.achievement import (
    AchievementUnlockRequest,
    AchievementUnlockResponse,
    AchievementsListResponse,
)
from app.services.achievement_service import unlock_achievement, get_user_achievements
from app.services.game_scanner import games_cache

router = APIRouter(prefix="/api/achievements", tags=["achievements"])


@router.get("", response_model=AchievementsListResponse)
async def list_achievements(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all achievement definitions with the user's unlock state."""
    return await get_user_achievements(db, current_user.id)


@router.post("/{game_id}/unlock", response_model=AchievementUnlockResponse)
async def unlock_game_achievement(
    game_id: str,
    body: AchievementUnlockRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Unlock a per-game achievement by ID."""
    if game_id not in games_cache:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Game not found")

    result = await unlock_achievement(db, current_user.id, game_id, body.achievement_id)
    return result
