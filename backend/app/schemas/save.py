from datetime import datetime

from pydantic import BaseModel


class SaveDataPut(BaseModel):
    save_data: dict


class SaveDataResponse(BaseModel):
    id: int
    game_id: str
    save_data: dict
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
