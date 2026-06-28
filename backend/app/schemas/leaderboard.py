from datetime import datetime
from pydantic import BaseModel, Field, field_validator

from app.validators import MAX_SCORE_BYTES, MAX_SCORE_VALUE, json_size


class ScoreSubmitRequest(BaseModel):
    score_data: dict

    @field_validator("score_data")
    @classmethod
    def validate_score(cls, v: dict) -> dict:
        if json_size(v) > MAX_SCORE_BYTES:
            raise ValueError("Score payload too large")
        score = v.get("score")
        if score is not None:
            if not isinstance(score, (int, float)) or score < 0 or score > MAX_SCORE_VALUE:
                raise ValueError("Invalid score value")
        return v


class LeaderboardEntryResponse(BaseModel):
    id: int
    username: str
    score_data: dict
    submitted_at: datetime

    class Config:
        from_attributes = True


class LeaderboardEntryRow(BaseModel):
    rank: int
    username: str
    score_data: dict
    submitted_at: datetime


class LeaderboardResponse(BaseModel):
    entries: list[LeaderboardEntryRow]
    total: int
    user_rank: int | None = None
    user_entry: LeaderboardEntryRow | None = None
    view: str


class ScoreSubmitResponse(BaseModel):
    success: bool
    rank: int | None = None
    entry_id: int | None = None
