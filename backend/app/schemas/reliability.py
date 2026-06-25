from datetime import datetime
from pydantic import BaseModel, Field
from typing import List, Literal

class ApprovalRequest(BaseModel):
    agent_name: str = Field(..., description="Name of the agent deliverable to approve")

class EditRequest(BaseModel):
    agent_name: str = Field(..., description="Name of the agent deliverable to edit")
    new_output: str = Field(..., description="The edited markdown content")

class RegenerateRequest(BaseModel):
    agent_name: str = Field(..., description="Name of the agent to regenerate")

class ProjectMemoryResponse(BaseModel):
    id: str
    project_id: str
    memory_type: str
    content: str
    summary: str
    created_at: datetime

    class Config:
        from_attributes = True

class HumanApprovalResponse(BaseModel):
    id: str
    execution_id: str
    deliverable_name: str
    action: str
    timestamp: datetime

    class Config:
        from_attributes = True
