from datetime import datetime, timezone

from sqlalchemy import select, desc, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.db import UserAchievement, User
from app.services.game_scanner import games_cache, total_achievements_count
from app.services.universal_achievement_scanner import universal_achievements_cache


async def get_profile(db: AsyncSession, user: User) -> dict:
    """Build aggregated profile data for a user."""
    user_id = user.id

    stats_result = await db.execute(
        text("""
            SELECT
                (SELECT COUNT(DISTINCT game_id) FROM game_saves WHERE user_id = :uid),
                (SELECT COUNT(*) FROM game_saves WHERE user_id = :uid),
                (SELECT COUNT(*) FROM user_achievements WHERE user_id = :uid),
                (SELECT COUNT(*) FROM leaderboard_entries WHERE user_id = :uid)
        """),
        {"uid": user_id},
    )
    row = stats_result.fetchone()
    games_played = row[0] or 0
    total_saves = row[1] or 0
    achievements_unlocked = row[2] or 0
    leaderboard_entries = row[3] or 0

    created = user.created_at.replace(tzinfo=None) if user.created_at.tzinfo else user.created_at
    account_age_days = (datetime.now(timezone.utc).replace(tzinfo=None) - created).days

    result = await db.execute(
        select(UserAchievement)
        .where(UserAchievement.user_id == user_id)
        .order_by(desc(UserAchievement.unlocked_at))
        .limit(5)
    )
    recent = result.scalars().all()

    ach_lookup: dict[str, tuple[str, str]] = {}
    for ach in universal_achievements_cache:
        ach_lookup[f"universal:{ach['id']}"] = (ach["title"], ach.get("icon", "star"))
    for gid, game_data in games_cache.items():
        for ach in game_data.get("achievements", []):
            ach_lookup[f"game:{gid}:{ach['id']}"] = (ach["title"], ach.get("icon", "star"))

    recent_achievements = []
    for ra in recent:
        title, icon = ach_lookup.get(ra.achievement_key, (ra.achievement_key, "star"))
        recent_achievements.append({
            "achievement_key": ra.achievement_key,
            "title": title,
            "icon": icon,
            "unlocked_at": ra.unlocked_at,
        })

    return {
        "user": {"id": user.id, "username": user.username, "created_at": user.created_at},
        "stats": {
            "games_played": games_played,
            "total_saves": total_saves,
            "achievements_unlocked": achievements_unlocked,
            "total_achievements": total_achievements_count + len(universal_achievements_cache),
            "leaderboard_entries": leaderboard_entries,
            "account_age_days": account_age_days,
        },
        "recent_achievements": recent_achievements,
    }
