from datetime import datetime
from pydantic import BaseModel


class ProfileStats(BaseModel):
    games_played: int = 0
    total_saves: int = 0
    achievements_unlocked: int = 0
    total_achievements: int = 0
    leaderboard_entries: int = 0
    account_age_days: int = 0


class RecentAchievement(BaseModel):
    achievement_key: str
    title: str
    icon: str = "star"
    unlocked_at: datetime


class ProfileResponse(BaseModel):
    user: dict
    stats: ProfileStats
    recent_achievements: list[RecentAchievement] = []
