from datetime import datetime
from pydantic import BaseModel


class ScoreSubmitRequest(BaseModel):
    score_data: dict


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
