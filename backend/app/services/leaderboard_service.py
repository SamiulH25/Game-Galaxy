from datetime import datetime, timezone
import json

from sqlalchemy import select, func, desc, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.db import LeaderboardEntry, User


async def submit_score(
    db: AsyncSession,
    user_id: int,
    game_id: str,
    score_data: dict,
) -> dict:
    """Submit a score. Keeps only the best score per user (by score_data.score if numeric)."""
    now = datetime.now(timezone.utc)
    score_json = json.dumps(score_data)

    # Check existing entry for this user + game
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
                    # Not better than existing — rank stays the same
                    return await _build_submit_response(db, game_id, user_id, existing.id)
            except (ValueError, TypeError):
                pass
        # Update existing entry
        existing.score_data = score_json
        existing.submitted_at = now
        await db.commit()
        await db.refresh(existing)
        entry_id = existing.id
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
        entry_id = entry.id

    return await _build_submit_response(db, game_id, user_id, entry_id)


async def _build_submit_response(
    db: AsyncSession,
    game_id: str,
    user_id: int,
    entry_id: int,
) -> dict:
    """Calculate the user's rank after submission by counting entries with higher scores."""
    # Get the submitted entry's score
    result = await db.execute(
        select(LeaderboardEntry).where(LeaderboardEntry.id == entry_id)
    )
    entry = result.scalar_one_or_none()

    rank = None
    if entry:
        try:
            user_score_val = json.loads(entry.score_data).get("score")
            if user_score_val is not None:
                # Count entries with a strictly better score
                score_sql = text("""
                    SELECT COUNT(*) AS cnt FROM leaderboard_entries
                    WHERE game_id = :game_id
                      AND id != :entry_id
                      AND json_extract(score_data, '$.score') + 0.0 > :user_score
                """)
                result = await db.execute(
                    score_sql,
                    {"game_id": game_id, "entry_id": entry_id, "user_score": user_score_val},
                )
                row = result.fetchone()
                better_count = row[0] if row else 0
                rank = better_count + 1
        except (ValueError, TypeError, Exception):
            pass

    # Count total entries for this game
    total_result = await db.execute(
        select(func.count(LeaderboardEntry.id))
        .where(LeaderboardEntry.game_id == game_id)
    )
    total = total_result.scalar() or 0

    return {
        "success": True,
        "rank": rank or 1,
        "entry_id": entry_id,
    }


async def get_leaderboard(
    db: AsyncSession,
    game_id: str,
    view: str = "best",
    limit: int = 50,
    user_id: int | None = None,
) -> dict:
    """Get leaderboard entries for a game."""
    if view == "latest":
        # Latest entries — ordered by submission time
        result = await db.execute(
            select(LeaderboardEntry)
            .where(LeaderboardEntry.game_id == game_id)
            .order_by(desc(LeaderboardEntry.submitted_at))
            .limit(limit)
        )
        entries = result.scalars().all()
        total = len(entries)

        # Fetch usernames
        rows = []
        for rank, entry in enumerate(entries, 1):
            user_result = await db.execute(select(User).where(User.id == entry.user_id))
            user = user_result.scalar_one_or_none()
            rows.append({
                "rank": rank,
                "username": user.username if user else "Unknown",
                "score_data": json.loads(entry.score_data),
                "submitted_at": entry.submitted_at,
            })
    else:
        # Best entries — best score per user, sorted by score_data.score DESC
        # Use raw SQL since SQLAlchemy doesn't handle subquery-based per-user grouping cleanly
        entries_sql = text("""
            SELECT le.*, u.username
            FROM leaderboard_entries le
            JOIN users u ON u.id = le.user_id
            WHERE le.game_id = :game_id
            ORDER BY json_extract(le.score_data, '$.score') + 0.0 DESC, le.submitted_at ASC
            LIMIT :limit
        """)
        result = await db.execute(entries_sql, {"game_id": game_id, "limit": limit})
        raw = result.fetchall()

        rows = []
        seen_users = set()
        for rank, row in enumerate(raw, 1):
            uid = row._mapping.get("user_id") or row[2]
            if uid in seen_users:
                continue
            seen_users.add(uid)
            rows.append({
                "rank": rank,
                "username": row._mapping.get("username", "Unknown"),
                "score_data": json.loads(row._mapping.get("score_data", "{}") or row[3]),
                "submitted_at": row._mapping.get("submitted_at", datetime.now(timezone.utc)),
            })

    total_count_result = await db.execute(
        select(func.count(distinct(LeaderboardEntry.user_id)))
        .where(LeaderboardEntry.game_id == game_id)
    )
    total = total_count_result.scalar() or 0

    # Find user's entry if authenticated
    user_entry = None
    user_rank = None
    if user_id is not None:
        result = await db.execute(
            select(LeaderboardEntry)
            .where(
                LeaderboardEntry.game_id == game_id,
                LeaderboardEntry.user_id == user_id,
            )
            .order_by(desc(LeaderboardEntry.submitted_at))
            .limit(1)
        )
        ue = result.scalar_one_or_none()
        if ue:
            ur = await db.execute(select(User).where(User.id == user_id))
            u = ur.scalar_one_or_none()
            user_entry = {
                "rank": 0,
                "username": u.username if u else "Unknown",
                "score_data": json.loads(ue.score_data),
                "submitted_at": ue.submitted_at,
            }
            # Calculate rank
            try:
                uv = json.loads(ue.score_data).get("score")
                if uv is not None:
                    better = await db.execute(
                        select(func.count(LeaderboardEntry.user_id))
                        .where(
                            LeaderboardEntry.game_id == game_id,
                            LeaderboardEntry.user_id != user_id,
                        )
                    )
                    user_rank = (better.scalar() or 0) + 1
                    user_entry["rank"] = user_rank
            except (ValueError, TypeError):
                pass

    return {
        "entries": rows,
        "total": total,
        "user_rank": user_rank,
        "user_entry": user_entry,
        "view": view,
    }
