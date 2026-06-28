"""Shared validation helpers for API payloads."""

from __future__ import annotations

import json
import re

from fastapi import HTTPException, status

ACHIEVEMENT_ID_RE = re.compile(r"^[\w-]{1,64}$")
MAX_SAVE_BYTES = 256_000
MAX_SCORE_BYTES = 4_096
MAX_SCORE_VALUE = 1_000_000_000


def json_size(data: dict) -> int:
    return len(json.dumps(data, separators=(",", ":")))


def validate_save_data(data: dict) -> dict:
    if not isinstance(data, dict):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="save_data must be an object")
    if json_size(data) > MAX_SAVE_BYTES:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Save data too large")
    return data


def validate_score_data(data: dict) -> dict:
    if not isinstance(data, dict):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="score_data must be an object")
    if json_size(data) > MAX_SCORE_BYTES:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Score payload too large")
    score = data.get("score")
    if score is not None:
        if not isinstance(score, (int, float)) or score < 0 or score > MAX_SCORE_VALUE:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid score value")
    return data


def validate_achievement_id(achievement_id: str, game: dict) -> None:
    if not ACHIEVEMENT_ID_RE.match(achievement_id):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid achievement id")
    valid_ids = {a["id"] for a in game.get("achievements", []) if isinstance(a, dict) and "id" in a}
    if achievement_id not in valid_ids:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown achievement")
