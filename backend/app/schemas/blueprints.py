from datetime import datetime
from pydantic import BaseModel, Field
from typing import List, Literal

class AgentCreateSchema(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    responsibility: str = Field(..., min_length=1)

class AgentResponseSchema(BaseModel):
    id: str
    name: str
    responsibility: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class DeliverableResponseSchema(BaseModel):
    id: str
    name: str
    created_at: datetime

    class Config:
        from_attributes = True

class BlueprintResponseSchema(BaseModel):
    id: str
    project_id: str
    category: str
    domain: str
    complexity: Literal['Low', 'Medium', 'High']
    estimated_steps: int
    created_at: datetime
    deliverables: List[DeliverableResponseSchema]
    agents: List[AgentResponseSchema]

    class Config:
        from_attributes = True

class AgentUpdateSchema(BaseModel):
    id: str | None = None
    name: str = Field(..., min_length=1, max_length=100)
    responsibility: str = Field(..., min_length=1)

class DeliverableUpdateSchema(BaseModel):
    id: str | None = None
    name: str = Field(..., min_length=1)

class BlueprintUpdateSchema(BaseModel):
    category: str = Field(..., min_length=1)
    domain: str = Field(..., min_length=1)
    complexity: Literal['Low', 'Medium', 'High']
    estimated_steps: int = Field(..., ge=1)
    deliverables: List[DeliverableUpdateSchema]
    agents: List[AgentUpdateSchema]

