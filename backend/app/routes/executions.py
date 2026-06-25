from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.database.session import get_db
from app.schemas.executions import (
    WorkflowExecutionResponseSchema, 
    WorkflowExecutionDetailsSchema
)
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.models.project import Project
from app.models.blueprint import Blueprint
from app.models.execution import WorkflowExecution, AgentOutput
from app.services.execution.workflow_engine import run_workflow_pipeline
from datetime import datetime, timezone
from typing import List

router = APIRouter(prefix="/projects", tags=["executions"])

@router.post("/{project_id}/execute", response_model=WorkflowExecutionResponseSchema, status_code=status.HTTP_201_CREATED)
async def execute_workflow(
    project_id: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Verify project exists and belongs to user
    result = await db.execute(
        select(Project).filter(Project.id == project_id, Project.user_id == current_user.id)
    )
    project = result.scalars().first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )

    # Verify user has remaining credits
    if current_user.credits <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No execution credits remaining. Please contact support to upgrade."
        )
        
    # Verify blueprint exists for this project
    bp_result = await db.execute(
        select(Blueprint).filter(Blueprint.project_id == project_id)
    )
    blueprint = bp_result.scalars().first()
    if not blueprint:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please generate a project blueprint first before executing a workflow."
        )
        
    # Create new workflow execution record
    new_execution = WorkflowExecution(
        project_id=project_id,
        status="Pending",
        started_at=datetime.now(timezone.utc),
        progress_percentage=0
    )
    db.add(new_execution)
    await db.commit()
    await db.refresh(new_execution)
    
    # Spawn the LangGraph workflow running task in the background
    background_tasks.add_task(run_workflow_pipeline, new_execution.id, project_id)
    
    return new_execution

@router.get("/{project_id}/execution/status", response_model=WorkflowExecutionResponseSchema)
async def get_execution_status(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Verify project exists and belongs to user
    proj_result = await db.execute(
        select(Project).filter(Project.id == project_id, Project.user_id == current_user.id)
    )
    if not proj_result.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
        
    # Get the latest execution for this project
    exec_result = await db.execute(
        select(WorkflowExecution)
        .filter(WorkflowExecution.project_id == project_id)
        .order_by(WorkflowExecution.started_at.desc())
    )
    execution = exec_result.scalars().first()
    if not execution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No execution history found for this project."
        )
    return execution

@router.get("/{project_id}/results", response_model=WorkflowExecutionDetailsSchema)
async def get_execution_results(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Verify project exists and belongs to user
    proj_result = await db.execute(
        select(Project).filter(Project.id == project_id, Project.user_id == current_user.id)
    )
    if not proj_result.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
        
    # Get the latest execution details
    exec_result = await db.execute(
        select(WorkflowExecution)
        .filter(WorkflowExecution.project_id == project_id)
        .order_by(WorkflowExecution.started_at.desc())
    )
    execution = exec_result.scalars().first()
    if not execution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No execution history found for this project."
        )
        
    # Fetch all outputs associated with this execution
    out_result = await db.execute(
        select(AgentOutput)
        .filter(AgentOutput.execution_id == execution.id)
        .order_by(AgentOutput.created_at.asc())
    )
    outputs = out_result.scalars().all()
    
    return {
        "execution": execution,
        "outputs": outputs
    }
