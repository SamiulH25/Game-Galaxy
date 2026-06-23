from datetime import datetime, timezone
from sqlalchemy import select, func, distinct
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.db import UserAchievement, GameSave, User
from app.services.game_scanner import games_cache
from app.services.universal_achievement_scanner import universal_achievements_cache


async def unlock_achievement(
    db: AsyncSession,
    user_id: int,
    game_id: str,
    achievement_id: str,
) -> dict:
    """Unlock a per-game achievement. Idempotent — safe to call multiple times."""
    key = f"game:{game_id}:{achievement_id}"

    result = await db.execute(
        select(UserAchievement).where(
            UserAchievement.user_id == user_id,
            UserAchievement.achievement_key == key,
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        return {"success": True, "already_unlocked": True, "achievement_key": key, "unlocked_at": existing.unlocked_at}

    now = datetime.now(timezone.utc)
    achievement = UserAchievement(
        user_id=user_id,
        achievement_key=key,
        game_id=game_id,
        unlocked_at=now,
    )
    db.add(achievement)
    await db.commit()
    await db.refresh(achievement)

    return {"success": True, "already_unlocked": False, "achievement_key": key, "unlocked_at": now}


async def check_universal_achievements(
    db: AsyncSession,
    user_id: int,
) -> list[dict]:
    """Check which universal achievements the user qualifies for and unlock any new ones."""
    newly_unlocked = []

    # Count distinct games played
    result = await db.execute(
        select(func.count(distinct(GameSave.game_id)))
        .where(GameSave.user_id == user_id)
    )
    games_played = result.scalar() or 0

    # Count total saves
    result = await db.execute(
        select(func.count(GameSave.id))
        .where(GameSave.user_id == user_id)
    )
    total_saves = result.scalar() or 0

    # Count leaderboard entries
    result = await db.execute(
        select(func.count(LeaderboardEntry.id))
        .where(LeaderboardEntry.user_id == user_id)
    )
    score_count = result.scalar() or 0

    total_games = len(games_cache)
    now = datetime.now(timezone.utc)

    for ach in universal_achievements_cache:
        aid = ach["id"]
        key = f"universal:{aid}"

        # Check if already unlocked
        result = await db.execute(
            select(UserAchievement).where(
                UserAchievement.user_id == user_id,
                UserAchievement.achievement_key == key,
            )
        )
        if result.scalar_one_or_none():
            continue

        should_unlock = False
        if aid == "first_game" and games_played >= 1:
            should_unlock = True
        elif aid == "explorer_5" and games_played >= 5:
            should_unlock = True
        elif aid == "explorer_10" and games_played >= 10:
            should_unlock = True
        elif aid == "completionist" and games_played >= total_games:
            should_unlock = True
        elif aid == "saver_10" and total_saves >= 10:
            should_unlock = True
        elif aid == "saver_50" and total_saves >= 50:
            should_unlock = True
        elif aid == "scoreboard_first" and score_count >= 1:
            should_unlock = True

        if should_unlock:
            ua = UserAchievement(
                user_id=user_id,
                achievement_key=key,
                game_id=None,
                unlocked_at=now,
            )
            db.add(ua)
            newly_unlocked.append({
                "achievement_key": key,
                "title": ach["title"],
                "icon": ach["icon"],
                "unlocked_at": now,
            })

    if newly_unlocked:
        await db.commit()

    return newly_unlocked


async def get_user_achievements(
    db: AsyncSession,
    user_id: int,
) -> dict:
    """Get all achievement definitions + user's unlocked state."""
    result = await db.execute(
        select(UserAchievement).where(UserAchievement.user_id == user_id)
    )
    user_achs = result.scalars().all()
    unlocked_keys = {ua.achievement_key for ua in user_achs}

    # Build per-game achievements from manifests
    per_game: dict[str, list] = {}
    for gid, game in games_cache.items():
        game_achs = game.get("achievements", [])
        if game_achs:
            per_game[gid] = game_achs

    return {
        "per_game": per_game,
        "universal": universal_achievements_cache,
        "unlocked": list(unlocked_keys),
    }
