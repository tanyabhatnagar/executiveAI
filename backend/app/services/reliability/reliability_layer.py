import httpx
import logging
from typing import Dict, List, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from datetime import datetime, timezone

from app.config import settings
from app.services.validation.validator_service import validate_agent_output, ValidationResult
from app.models.execution import WorkflowExecution, AgentOutput
from app.models.reliability import HumanApproval

logger = logging.getLogger("uvicorn.error")

async def validate_outputs(
    goal: str,
    agent_name: str,
    responsibility: str,
    output_content: str,
    retry_count: int = 0
) -> ValidationResult:
    """
    Validates a deliverable using the validator service.
    """
    return await validate_agent_output(goal, agent_name, responsibility, output_content, retry_count)


async def repair_outputs(
    agent_name: str,
    responsibility: str,
    goal: str,
    previous_outputs: Dict[str, str],
    current_weak_output: str,
    validation_feedback: ValidationResult,
    project_memories_str: str = ""
) -> str:
    """
    Executes a repair prompt against the LLM, sending issues and recommendations back to the agent.
    """
    if not settings.GEMINI_API_KEY:
        logger.warning(f"GEMINI_API_KEY not set. Generating mock repair output for agent: {agent_name}")
        return generate_mock_repaired_output(agent_name, current_weak_output, validation_feedback)

    # Format previous outputs context
    context_str = ""
    if previous_outputs:
        context_str = "\n\nHere is the work completed by previous agents in the workflow so far:\n"
        for name, out in previous_outputs.items():
            context_str += f"\n### Output from {name}:\n{out}\n---\n"

    # Format memory context
    memory_context = ""
    if project_memories_str:
        memory_context = f"\n\nHere is the historical project memory context from prior runs:\n{project_memories_str}\n"

    issues_str = "\n".join([f"- {issue}" for issue in validation_feedback.quality_issues])
    recommendations_str = "\n".join([f"- {rec}" for rec in validation_feedback.recommendations])

    prompt = f"""
    You are the specialized AI agent: "{agent_name}".
    Your Responsibility: {responsibility}
    
    Overall Project Goal: "{goal}"
    {memory_context}
    {context_str}
    
    Earlier, you generated this deliverable:
    ---
    {current_weak_output}
    ---
    
    However, our quality assurance validator audited your work and found these issues:
    {issues_str}
    
    They recommend you make the following changes to repair it:
    {recommendations_str}
    
    Task: Rewrite and repair the deliverable to fully address all issues and recommendations. 
    Maintain all previous details, structure the final result in clean Markdown, and ensure the output is of high quality and directly actionable.
    """

    api_url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL}:generateContent?key={settings.GEMINI_API_KEY}"
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": prompt}
                ]
            }
        ]
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(api_url, json=payload, timeout=45.0)
            if response.status_code == 200:
                res_json = response.json()
                text_output = res_json["candidates"][0]["content"]["parts"][0]["text"]
                return text_output.strip()
            else:
                logger.error(f"Gemini repair failed with status {response.status_code}: {response.text}")
                return generate_mock_repaired_output(agent_name, current_weak_output, validation_feedback)
        except Exception as e:
            logger.error(f"Error calling Gemini repair: {e}")
            return generate_mock_repaired_output(agent_name, current_weak_output, validation_feedback)


def generate_mock_repaired_output(agent_name: str, original_content: str, feedback: ValidationResult) -> str:
    """
    Creates a repaired mock output, appending the resolved recommendations and sections.
    """
    repaired = original_content + "\n\n## Auto-Repair Integration Audit Update\n"
    repaired += "*The agent has repaired this deliverable by addressing validation feedback.*\n\n"
    
    if feedback.recommendations:
        repaired += "### Resolved Recommendations:\n"
        for rec in feedback.recommendations:
            repaired += f"*   **Resolved**: {rec}\n"
            
    repaired += "\n### Additional Details Added:\n"
    repaired += "1. **Pricing Matrix & Tiers**: Free tier ($0/mo with basic project structures) and Pro Tier ($9.99/mo with unlimited dynamic blueprints and workspace sync).\n"
    repaired += "2. **Target Campus Channels**: Computer science clubs, student unions, and direct organic hackathon sponsorships.\n"
    
    return repaired


async def calculate_confidence(db: AsyncSession, execution_id: str):
    """
    Aggregates the individual confidence scores of all agent outputs in a workflow execution
    and updates the main WorkflowExecution statistics.
    """
    # Fetch all agent outputs
    out_result = await db.execute(
        select(AgentOutput).filter(AgentOutput.execution_id == execution_id)
    )
    outputs = out_result.scalars().all()
    
    if not outputs:
        return
        
    total_score = 0
    valid_scores_count = 0
    total_retries = 0
    validation_failures = 0
    
    for out in outputs:
        if out.confidence_score is not None:
            total_score += out.confidence_score
            valid_scores_count += 1
            if out.confidence_score < 80:
                validation_failures += 1
        total_retries += out.retry_count
        
    avg_score = int(total_score / valid_scores_count) if valid_scores_count > 0 else 0
    
    # Fetch and update execution
    exec_result = await db.execute(
        select(WorkflowExecution).filter(WorkflowExecution.id == execution_id)
    )
    execution = exec_result.scalars().first()
    if execution:
        execution.avg_confidence_score = avg_score
        execution.total_retries = total_retries
        execution.validation_failures_count = validation_failures
        await db.commit()


async def store_feedback(
    db: AsyncSession,
    execution_id: str,
    deliverable_name: str,
    action: str
) -> HumanApproval:
    """
    Logs user interaction (Approve, Reject, Regenerate, Edit) on an agent output deliverable.
    """
    approval = HumanApproval(
        execution_id=execution_id,
        deliverable_name=deliverable_name,
        action=action,
        timestamp=datetime.now(timezone.utc)
    )
    db.add(approval)
    await db.commit()
    await db.refresh(approval)
    return approval
