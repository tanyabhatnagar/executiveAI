from datetime import datetime
from pydantic import BaseModel
from typing import List, Literal

class AgentOutputResponseSchema(BaseModel):
    id: str
    execution_id: str
    agent_name: str
    output: str
    created_at: datetime
    confidence_score: int | None = None
    retry_count: int = 0
    validation_issues: str | None = None

    class Config:
        from_attributes = True

class WorkflowExecutionResponseSchema(BaseModel):
    id: str
    project_id: str
    status: Literal['Pending', 'Running', 'Completed', 'Failed']
    started_at: datetime
    completed_at: datetime | None
    current_agent: str | None
    progress_percentage: int
    error_log: str | None
    avg_confidence_score: int = 0
    total_retries: int = 0
    validation_failures_count: int = 0

    class Config:
        from_attributes = True

class WorkflowExecutionDetailsSchema(BaseModel):
    execution: WorkflowExecutionResponseSchema
    outputs: List[AgentOutputResponseSchema]
