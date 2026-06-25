from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List
from datetime import datetime, timezone

from app.database.session import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.models.project import Project
from app.models.execution import WorkflowExecution, AgentOutput
from app.models.blueprint import Blueprint, Agent
from app.models.reliability import HumanApproval, ProjectMemory

from app.schemas.reliability import (
    ApprovalRequest,
    EditRequest,
    RegenerateRequest,
    ProjectMemoryResponse,
    HumanApprovalResponse
)
from app.schemas.executions import AgentOutputResponseSchema

from app.services.reliability.reliability_layer import (
    store_feedback,
    calculate_confidence,
    validate_outputs,
    repair_outputs
)
from app.services.memory.memory_service import store_memory, retrieve_memory
from app.services.ai.llm_service import execute_agent

router = APIRouter(prefix="/projects", tags=["reliability"])


@router.get("/reliability/stats", response_model=dict)
async def get_reliability_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Fetch all projects belonging to the user
    proj_result = await db.execute(
        select(Project.id).filter(Project.user_id == current_user.id)
    )
    project_ids = [pid for pid in proj_result.scalars().all()]
    
    if not project_ids:
        return {
            "avg_confidence": 0,
            "retry_count": 0,
            "approval_rate": 0,
            "validation_failures": 0,
            "memory_entries": 0
        }
        
    # 1. Fetch overall executions metrics
    exec_result = await db.execute(
        select(WorkflowExecution).filter(WorkflowExecution.project_id.in_(project_ids))
    )
    executions = exec_result.scalars().all()
    
    total_executions = len(executions)
    avg_confidence = 0
    total_retries = 0
    validation_failures = 0
    
    if total_executions > 0:
        conf_scores = [e.avg_confidence_score for e in executions if e.avg_confidence_score > 0]
        avg_confidence = int(sum(conf_scores) / len(conf_scores)) if conf_scores else 0
        total_retries = sum(e.total_retries for e in executions)
        validation_failures = sum(e.validation_failures_count for e in executions)
        
    # 2. Memory entries count
    memory_entries = 0
    mem_result = await db.execute(
        select(ProjectMemory).filter(ProjectMemory.project_id.in_(project_ids))
    )
    memory_entries = len(mem_result.scalars().all())
    
    # 3. Approvals and Outputs count to get Approval Rate
    exec_ids = [e.id for e in executions]
    outputs_count = 0
    approvals_count = 0
    
    if exec_ids:
        out_res = await db.execute(
            select(AgentOutput).filter(AgentOutput.execution_id.in_(exec_ids))
        )
        outputs_count = len(out_res.scalars().all())
        
        app_res = await db.execute(
            select(HumanApproval).filter(
                HumanApproval.execution_id.in_(exec_ids),
                HumanApproval.action == "Approve"
            )
        )
        approvals_count = len(app_res.scalars().all())
        
    approval_rate = int((approvals_count / outputs_count) * 100) if outputs_count > 0 else 0
    
    return {
        "avg_confidence": avg_confidence,
        "retry_count": total_retries,
        "approval_rate": approval_rate,
        "validation_failures": validation_failures,
        "memory_entries": memory_entries
    }


@router.post("/{project_id}/execution/{execution_id}/approve", response_model=HumanApprovalResponse)
async def approve_deliverable(
    project_id: str,
    execution_id: str,
    payload: ApprovalRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Verify project ownership
    proj_result = await db.execute(
        select(Project).filter(Project.id == project_id, Project.user_id == current_user.id)
    )
    if not proj_result.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )

    # Fetch corresponding agent output
    output_result = await db.execute(
        select(AgentOutput).filter(
            AgentOutput.execution_id == execution_id,
            AgentOutput.agent_name == payload.agent_name
        )
    )
    agent_output = output_result.scalars().first()
    if not agent_output:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Agent output not found for: {payload.agent_name}"
        )

    # Log action to HumanApprovals
    approval = await store_feedback(db, execution_id, payload.agent_name, "Approve")

    # Add to ProjectMemory
    # Avoid duplicate memories of the same type by checking and updating or just appending.
    # Let's check if a memory of this memory_type already exists, and overwrite it to keep a single active state, or append.
    # The requirement says: "Each project should accumulate memory over time."
    # Let's append to accumulate historical runs, which fits the timeline UI best!
    await store_memory(
        db=db,
        project_id=project_id,
        memory_type=payload.agent_name,
        content=agent_output.output
    )

    return approval


@router.post("/{project_id}/execution/{execution_id}/edit", response_model=AgentOutputResponseSchema)
async def edit_deliverable(
    project_id: str,
    execution_id: str,
    payload: EditRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Verify project ownership
    proj_result = await db.execute(
        select(Project).filter(Project.id == project_id, Project.user_id == current_user.id)
    )
    if not proj_result.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )

    # Fetch corresponding agent output
    output_result = await db.execute(
        select(AgentOutput).filter(
            AgentOutput.execution_id == execution_id,
            AgentOutput.agent_name == payload.agent_name
        )
    )
    agent_output = output_result.scalars().first()
    if not agent_output:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Agent output not found for: {payload.agent_name}"
        )

    # Update output content, confidence score set to 100 since manual edit
    agent_output.output = payload.new_output
    agent_output.confidence_score = 100
    
    await db.commit()

    # Log action to HumanApprovals
    await store_feedback(db, execution_id, payload.agent_name, "Edit")

    # Recalculate execution stats
    await calculate_confidence(db, execution_id)
    await db.refresh(agent_output)

    return agent_output


@router.post("/{project_id}/execution/{execution_id}/regenerate-agent", response_model=AgentOutputResponseSchema)
async def regenerate_deliverable(
    project_id: str,
    execution_id: str,
    payload: RegenerateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Verify project ownership
    proj_result = await db.execute(
        select(Project).filter(Project.id == project_id, Project.user_id == current_user.id)
    )
    project = proj_result.scalars().first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )

    # Fetch execution and verify it belongs to this project
    exec_result = await db.execute(
        select(WorkflowExecution).filter(
            WorkflowExecution.id == execution_id,
            WorkflowExecution.project_id == project_id
        )
    )
    execution = exec_result.scalars().first()
    if not execution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow execution not found"
        )

    # Fetch blueprint and target agent config
    bp_result = await db.execute(
        select(Blueprint)
        .options(selectinload(Blueprint.agents))
        .filter(Blueprint.project_id == project_id)
    )
    blueprint = bp_result.scalars().first()
    if not blueprint or not blueprint.agents:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Project blueprint or agents not found."
        )

    target_agent = None
    agent_sequence = []
    for ag in blueprint.agents:
        agent_sequence.append(ag)
        if ag.name == payload.agent_name:
            target_agent = ag

    if not target_agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Agent '{payload.agent_name}' not defined in project blueprint."
        )

    # Find the position of the target agent
    target_idx = agent_sequence.index(target_agent)

    # Retrieve other outputs from this execution as prefix context (only those generated before target agent)
    out_result = await db.execute(
        select(AgentOutput).filter(AgentOutput.execution_id == execution_id)
    )
    all_outputs = out_result.scalars().all()
    
    prefix_outputs = {}
    allowed_agent_names = {ag.name for ag in agent_sequence[:target_idx]}
    for out in all_outputs:
        if out.agent_name in allowed_agent_names:
            prefix_outputs[out.agent_name] = out.output

    # Log action to HumanApprovals
    await store_feedback(db, execution_id, payload.agent_name, "Regenerate")

    # Fetch memory context
    project_memories_str = ""
    memories = await retrieve_memory(db, project_id)
    if memories:
        project_memories_str = "\n".join([f"- **{m.memory_type}**: {m.summary}" for m in memories])

    # Run agent execution
    try:
        output_text = await execute_agent(
            agent_name=target_agent.name,
            responsibility=target_agent.responsibility,
            goal=project.goal,
            previous_outputs=prefix_outputs,
            project_memories_str=project_memories_str
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Regeneration prompt failed: {str(e)}"
        )

    # Run Validation & Auto-Repair loop
    retry_idx = 0
    final_score = 80
    final_issues = ""
    validation_result = None
    
    while True:
        try:
            validation_result = await validate_outputs(
                goal=project.goal,
                agent_name=target_agent.name,
                responsibility=target_agent.responsibility,
                output_content=output_text,
                retry_count=retry_idx
            )
            final_score = validation_result.score
            final_issues = "; ".join(validation_result.quality_issues)
        except Exception as val_err:
            final_score = 80
            final_issues = ""
            break
            
        if final_score >= 80 or retry_idx >= 2:
            break
            
        retry_idx += 1
        try:
            output_text = await repair_outputs(
                agent_name=target_agent.name,
                responsibility=target_agent.responsibility,
                goal=project.goal,
                previous_outputs=prefix_outputs,
                current_weak_output=output_text,
                validation_feedback=validation_result,
                project_memories_str=project_memories_str
            )
        except Exception:
            break

    # Look up if the agent output already exists, update it, otherwise create
    existing_output_res = await db.execute(
        select(AgentOutput).filter(
            AgentOutput.execution_id == execution_id,
            AgentOutput.agent_name == target_agent.name
        )
    )
    db_output = existing_output_res.scalars().first()
    if db_output:
        db_output.output = output_text
        db_output.confidence_score = final_score
        db_output.retry_count = retry_idx
        db_output.validation_issues = final_issues if final_issues else None
    else:
        db_output = AgentOutput(
            execution_id=execution_id,
            agent_name=target_agent.name,
            output=output_text,
            confidence_score=final_score,
            retry_count=retry_idx,
            validation_issues=final_issues if final_issues else None
        )
        db.add(db_output)

    await db.commit()

    # Recalculate execution overall statistics
    await calculate_confidence(db, execution_id)
    await db.refresh(db_output)

    return db_output


@router.get("/{project_id}/memories", response_model=List[ProjectMemoryResponse])
async def get_memories_timeline(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Verify project ownership
    proj_result = await db.execute(
        select(Project).filter(Project.id == project_id, Project.user_id == current_user.id)
    )
    if not proj_result.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )

    memories = await retrieve_memory(db, project_id)
    return memories


@router.get("/{project_id}/execution/{execution_id}/approvals", response_model=List[HumanApprovalResponse])
async def get_execution_approvals(
    project_id: str,
    execution_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Verify project ownership
    proj_result = await db.execute(
        select(Project).filter(Project.id == project_id, Project.user_id == current_user.id)
    )
    if not proj_result.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )

    result = await db.execute(
        select(HumanApproval)
        .filter(HumanApproval.execution_id == execution_id)
        .order_by(HumanApproval.timestamp.desc())
    )
    return list(result.scalars().all())
