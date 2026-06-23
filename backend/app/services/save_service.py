import json
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.db import GameSave


async def get_save(db: AsyncSession, user_id: int, game_id: str) -> GameSave | None:
    result = await db.execute(
        select(GameSave).where(GameSave.user_id == user_id, GameSave.game_id == game_id)
    )
    return result.scalar_one_or_none()


async def upsert_save(db: AsyncSession, user_id: int, game_id: str, save_data: dict) -> GameSave:
    existing = await get_save(db, user_id, game_id)
    now = datetime.now(timezone.utc)

    if existing:
        existing.save_data = json.dumps(save_data)
        existing.updated_at = now
    else:
        existing = GameSave(
            user_id=user_id,
            game_id=game_id,
            save_data=json.dumps(save_data),
            created_at=now,
            updated_at=now,
        )
        db.add(existing)

    await db.commit()
    await db.refresh(existing)
    return existing
