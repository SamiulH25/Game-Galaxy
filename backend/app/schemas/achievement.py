from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel


class AchievementDefinition(BaseModel):
    id: str
    title: str
    description: str
    icon: str = "star"
    hidden: bool = False


class AchievementUnlockRequest(BaseModel):
    achievement_id: str


class AchievementUnlockResponse(BaseModel):
    success: bool
    already_unlocked: bool = False
    achievement_key: str | None = None
    unlocked_at: datetime | None = None


class UserAchievementResponse(BaseModel):
    achievement_key: str
    game_id: str | None
    unlocked_at: datetime

    class Config:
        from_attributes = True


class AchievementsListResponse(BaseModel):
    per_game: dict[str, list[AchievementDefinition]]  # game_id -> achievements
    universal: list[AchievementDefinition]
    unlocked: list[str]  # list of achievement_keys the user has unlocked
