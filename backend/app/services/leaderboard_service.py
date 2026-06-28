from datetime import datetime, timezone
import json

from sqlalchemy import select, func, desc, text, distinct
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.db import LeaderboardEntry, User

SCORE_RANK_SQL = text("""
    SELECT COUNT(*) AS cnt FROM leaderboard_entries
    WHERE game_id = :game_id
      AND id != :entry_id
      AND json_extract(score_data, '$.score') + 0.0 > :user_score
""")


async def submit_score(
    db: AsyncSession,
    user_id: int,
    game_id: str,
    score_data: dict,
) -> dict:
    """Submit a score. Keeps only the best score per user (by score_data.score if numeric)."""
    now = datetime.now(timezone.utc)
    score_json = json.dumps(score_data)

    result = await db.execute(
        select(LeaderboardEntry).where(
            LeaderboardEntry.user_id == user_id,
            LeaderboardEntry.game_id == game_id,
        )
    )
    existing = result.scalar_one_or_none()

    new_score = score_data.get("score")
    if existing:
        if new_score is not None:
            try:
                old_score = json.loads(existing.score_data).get("score")
                if old_score is not None and new_score <= old_score:
                    return await _build_submit_response(db, game_id, existing)
            except (ValueError, TypeError):
                pass
        existing.score_data = score_json
        existing.submitted_at = now
        await db.commit()
        await db.refresh(existing)
        entry = existing
    else:
        entry = LeaderboardEntry(
            game_id=game_id,
            user_id=user_id,
            score_data=score_json,
            submitted_at=now,
        )
        db.add(entry)
        await db.commit()
        await db.refresh(entry)

    return await _build_submit_response(db, game_id, entry)


async def _build_submit_response(
    db: AsyncSession,
    game_id: str,
    entry: LeaderboardEntry,
) -> dict:
    rank = 1
    try:
        user_score_val = json.loads(entry.score_data).get("score")
        if user_score_val is not None:
            result = await db.execute(
                SCORE_RANK_SQL,
                {"game_id": game_id, "entry_id": entry.id, "user_score": user_score_val},
            )
            row = result.fetchone()
            rank = (row[0] if row else 0) + 1
    except (ValueError, TypeError):
        pass

    return {
        "success": True,
        "rank": rank,
        "entry_id": entry.id,
    }


async def _user_rank_for_score(
    db: AsyncSession,
    game_id: str,
    entry: LeaderboardEntry,
) -> int | None:
    try:
        user_score_val = json.loads(entry.score_data).get("score")
        if user_score_val is None:
            return None
        result = await db.execute(
            SCORE_RANK_SQL,
            {"game_id": game_id, "entry_id": entry.id, "user_score": user_score_val},
        )
        row = result.fetchone()
        return (row[0] if row else 0) + 1
    except (ValueError, TypeError):
        return None


async def get_leaderboard(
    db: AsyncSession,
    game_id: str,
    view: str = "best",
    limit: int = 50,
    user_id: int | None = None,
) -> dict:
    """Get leaderboard entries for a game."""
    if view == "latest":
        result = await db.execute(
            select(LeaderboardEntry, User.username)
            .join(User, User.id == LeaderboardEntry.user_id)
            .where(LeaderboardEntry.game_id == game_id)
            .order_by(desc(LeaderboardEntry.submitted_at))
            .limit(limit)
        )
        rows = []
        for rank, (entry, username) in enumerate(result.all(), 1):
            rows.append({
                "rank": rank,
                "username": username,
                "score_data": json.loads(entry.score_data),
                "submitted_at": entry.submitted_at,
            })
    else:
        # One row per user (enforced by unique constraint); order by score
        entries_sql = text("""
            SELECT le.score_data, le.submitted_at, u.username
            FROM leaderboard_entries le
            JOIN users u ON u.id = le.user_id
            WHERE le.game_id = :game_id
            ORDER BY json_extract(le.score_data, '$.score') + 0.0 DESC, le.submitted_at ASC
            LIMIT :limit
        """)
        result = await db.execute(entries_sql, {"game_id": game_id, "limit": limit})
        rows = []
        for rank, row in enumerate(result.fetchall(), 1):
            mapping = row._mapping
            rows.append({
                "rank": rank,
                "username": mapping.get("username", "Unknown"),
                "score_data": json.loads(mapping.get("score_data", "{}")),
                "submitted_at": mapping.get("submitted_at", datetime.now(timezone.utc)),
            })

    total_count_result = await db.execute(
        select(func.count(distinct(LeaderboardEntry.user_id)))
        .where(LeaderboardEntry.game_id == game_id)
    )
    total = total_count_result.scalar() or 0

    user_entry = None
    user_rank = None
    if user_id is not None:
        result = await db.execute(
            select(LeaderboardEntry, User.username)
            .join(User, User.id == LeaderboardEntry.user_id)
            .where(
                LeaderboardEntry.game_id == game_id,
                LeaderboardEntry.user_id == user_id,
            )
            .limit(1)
        )
        row = result.first()
        if row:
            ue, username = row
            user_rank = await _user_rank_for_score(db, game_id, ue)
            user_entry = {
                "rank": user_rank or 0,
                "username": username,
                "score_data": json.loads(ue.score_data),
                "submitted_at": ue.submitted_at,
            }

    return {
        "entries": rows,
        "total": total,
        "user_rank": user_rank,
        "user_entry": user_entry,
        "view": view,
    }
