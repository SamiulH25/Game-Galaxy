from datetime import datetime

from pydantic import BaseModel, field_validator

from app.validators import MAX_SAVE_BYTES, json_size


class SaveDataPut(BaseModel):
    save_data: dict

    @field_validator("save_data")
    @classmethod
    def limit_size(cls, v: dict) -> dict:
        if json_size(v) > MAX_SAVE_BYTES:
            raise ValueError("Save data too large")
        return v


class SaveDataResponse(BaseModel):
    id: int
    game_id: str
    save_data: dict
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
