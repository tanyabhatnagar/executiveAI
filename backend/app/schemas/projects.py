from datetime import datetime
from pydantic import BaseModel, Field
from typing import Literal

class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    goal: str = Field(..., min_length=1)

class ProjectResponse(BaseModel):
    id: str
    user_id: str
    name: str
    goal: str
    status: Literal['Draft', 'Running', 'Completed']
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
