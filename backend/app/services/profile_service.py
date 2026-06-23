from datetime import datetime, timezone

from sqlalchemy import select, func, distinct, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.db import UserAchievement, GameSave, LeaderboardEntry, User
from app.services.game_scanner import games_cache
from app.services.universal_achievement_scanner import universal_achievements_cache


async def get_profile(db: AsyncSession, user: User) -> dict:
    """Build aggregated profile data for a user."""
    user_id = user.id

    # Games played (distinct game_ids in saves)
    result = await db.execute(
        select(func.count(distinct(GameSave.game_id)))
        .where(GameSave.user_id == user_id)
    )
    games_played = result.scalar() or 0

    # Total saves
    result = await db.execute(
        select(func.count(GameSave.id))
        .where(GameSave.user_id == user_id)
    )
    total_saves = result.scalar() or 0

    # Achievements unlocked
    result = await db.execute(
        select(func.count(UserAchievement.id))
        .where(UserAchievement.user_id == user_id)
    )
    achievements_unlocked = result.scalar() or 0

    # Total possible achievements
    total_achievements = len(universal_achievements_cache)
    for game_data in games_cache.values():
        total_achievements += len(game_data.get("achievements", []))

    # Leaderboard entries
    result = await db.execute(
        select(func.count(LeaderboardEntry.id))
        .where(LeaderboardEntry.user_id == user_id)
    )
    leaderboard_entries = result.scalar() or 0

    # Account age
    created = user.created_at.replace(tzinfo=None) if user.created_at.tzinfo else user.created_at
    account_age_days = (datetime.now(timezone.utc).replace(tzinfo=None) - created).days

    # Recent achievements (last 5)
    result = await db.execute(
        select(UserAchievement)
        .where(UserAchievement.user_id == user_id)
        .order_by(desc(UserAchievement.unlocked_at))
        .limit(5)
    )
    recent = result.scalars().all()

    recent_achievements = []
    for ra in recent:
        key = ra.achievement_key
        title = key
        icon = "star"
        unlocked_at = ra.unlocked_at

        if ra.game_id:
            game_data = games_cache.get(ra.game_id, {})
            for ach in game_data.get("achievements", []):
                if f"game:{ra.game_id}:{ach['id']}" == key:
                    title = ach["title"]
                    icon = ach.get("icon", "star")
                    break
        else:
            for ach in universal_achievements_cache:
                if f"universal:{ach['id']}" == key:
                    title = ach["title"]
                    icon = ach.get("icon", "star")
                    break

        recent_achievements.append({
            "achievement_key": key,
            "title": title,
            "icon": icon,
            "unlocked_at": unlocked_at,
        })

    return {
        "user": {"id": user.id, "username": user.username, "created_at": user.created_at},
        "stats": {
            "games_played": games_played,
            "total_saves": total_saves,
            "achievements_unlocked": achievements_unlocked,
            "total_achievements": total_achievements,
            "leaderboard_entries": leaderboard_entries,
            "account_age_days": account_age_days,
        },
        "recent_achievements": recent_achievements,
    }
