from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services.auth import get_current_user_optional
from app.models.db import User
from app.schemas.leaderboard import (
    ScoreSubmitRequest,
    ScoreSubmitResponse,
    LeaderboardResponse,
)
from app.services.leaderboard_service import submit_score, get_leaderboard
from app.services.game_scanner import games_cache
from app.validators import validate_score_data

router = APIRouter(prefix="/api/leaderboards", tags=["leaderboards"])


@router.post("/{game_id}/submit", response_model=ScoreSubmitResponse)
async def submit_leaderboard_score(
    game_id: str,
    body: ScoreSubmitRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_optional),
):
    """Submit a score for a game."""
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    if game_id not in games_cache:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Game not found")

    validate_score_data(body.score_data)
    return await submit_score(db, current_user.id, game_id, body.score_data)


@router.get("/{game_id}", response_model=LeaderboardResponse)
async def fetch_leaderboard(
    game_id: str,
    view: str = Query("best", pattern="^(best|latest)$"),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_optional),
):
    """Get leaderboard for a game."""
    if game_id not in games_cache:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Game not found")

    user_id = current_user.id if current_user else None
    return await get_leaderboard(db, game_id, view, limit, user_id)
