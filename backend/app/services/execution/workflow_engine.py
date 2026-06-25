import logging
from typing import Dict, List, Any, TypedDict
from datetime import datetime, timezone
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from langgraph.graph import StateGraph, START, END
from app.database.session import SessionLocal
from app.models.blueprint import Blueprint, Agent
from app.models.execution import WorkflowExecution, AgentOutput
from app.services.ai.llm_service import execute_agent

logger = logging.getLogger("uvicorn.error")

# 1. Define shared WorkflowState using TypedDict
class WorkflowState(TypedDict):
    project_id: str
    goal: str
    agents: List[Dict[str, Any]]
    outputs: Dict[str, str]
    current_agent_index: int
    execution_id: str

# 2. Node runner factory
def make_agent_node(agent_config: Dict[str, Any], execution_id: str):
    agent_name = agent_config["name"]
    responsibility = agent_config["responsibility"]
    
    async def agent_node(state: WorkflowState) -> Dict[str, Any]:
        logger.info(f"LangGraph node execution starting for agent: {agent_name}")
        
        # Calculate progress percentage based on current position in sequence
        agents_list = state["agents"]
        agent_names = [a["name"] for a in agents_list]
        try:
            current_idx = agent_names.index(agent_name)
        except ValueError:
            current_idx = 0
            
        progress = int(((current_idx + 1) / len(agents_list)) * 100)
        
        # Update database execution state: Set status=Running, active agent, progress
        async with SessionLocal() as db:
            result = await db.execute(
                select(WorkflowExecution).filter(WorkflowExecution.id == execution_id)
            )
            execution = result.scalars().first()
            if execution:
                execution.status = "Running"
                execution.current_agent = agent_name
                execution.progress_percentage = progress
                await db.commit()
        
        # Retrieve project memories to pass as context
        project_memories_str = ""
        try:
            async with SessionLocal() as db:
                from app.services.memory.memory_service import retrieve_memory
                memories = await retrieve_memory(db, state["project_id"])
                if memories:
                    project_memories_str = "\n".join([f"- **{m.memory_type}**: {m.summary}" for m in memories])
                    logger.info(f"Retrieved {len(memories)} memories for project context.")
        except Exception as mem_err:
            logger.error(f"Error fetching project memories: {mem_err}")

        # Call the LLM Executor with Retry logic (Feature 7)
        output_text = ""
        try:
            output_text = await execute_agent(
                agent_name=agent_name,
                responsibility=responsibility,
                goal=state["goal"],
                previous_outputs=state["outputs"],
                project_memories_str=project_memories_str
            )
        except Exception as primary_error:
            logger.warning(f"Primary run for agent {agent_name} failed: {primary_error}. Retrying once...")
            try:
                # Automatic Retry Once
                output_text = await execute_agent(
                    agent_name=agent_name,
                    responsibility=responsibility,
                    goal=state["goal"],
                    previous_outputs=state["outputs"],
                    project_memories_str=project_memories_str
                )
            except Exception as retry_error:
                logger.error(f"Retry also failed for agent {agent_name}: {retry_error}")
                # Log error and raise so the graph catch block marks execution as Failed
                raise Exception(f"Agent {agent_name} failed execution: {str(retry_error)}")

        # Run Validation & Auto-Repair loop (Features 3, 5, 9)
        from app.services.reliability.reliability_layer import validate_outputs, repair_outputs, calculate_confidence
        
        retry_idx = 0
        final_score = 80
        final_issues = ""
        validation_result = None
        
        while True:
            logger.info(f"Validating output for agent {agent_name} (Attempt {retry_idx + 1})")
            try:
                validation_result = await validate_outputs(
                    goal=state["goal"],
                    agent_name=agent_name,
                    responsibility=responsibility,
                    output_content=output_text,
                    retry_count=retry_idx
                )
                final_score = validation_result.score
                final_issues = "; ".join(validation_result.quality_issues)
            except Exception as val_err:
                logger.error(f"Validation failed for agent {agent_name}: {val_err}")
                # Fallback to default passing values
                final_score = 80
                final_issues = ""
                break
                
            if final_score >= 80 or retry_idx >= 2:
                # Stop if output is valid or maximum retries reached
                break
                
            logger.info(f"Validation score {final_score}% is below 80%. Initiating repair attempt {retry_idx + 1}...")
            retry_idx += 1
            try:
                output_text = await repair_outputs(
                    agent_name=agent_name,
                    responsibility=responsibility,
                    goal=state["goal"],
                    previous_outputs=state["outputs"],
                    current_weak_output=output_text,
                    validation_feedback=validation_result,
                    project_memories_str=project_memories_str
                )
            except Exception as repair_err:
                logger.error(f"Repair attempt {retry_idx} failed: {repair_err}")
                break

        # Save output product to DB with reliability metrics
        async with SessionLocal() as db:
            db_output = AgentOutput(
                execution_id=execution_id,
                agent_name=agent_name,
                output=output_text,
                confidence_score=final_score,
                retry_count=retry_idx,
                validation_issues=final_issues if final_issues else None
            )
            db.add(db_output)
            await db.commit()
            
            # Recalculate execution overall statistics
            await calculate_confidence(db, execution_id)

        # Update and return state delta
        updated_outputs = {**state["outputs"], agent_name: output_text}
        return {
            "outputs": updated_outputs,
            "current_agent_index": current_idx + 1
        }
        
    return agent_node

# 3. Main runner function to compile and launch graph
async def run_workflow_pipeline(execution_id: str, project_id: str):
    logger.info(f"Starting async workflow runner for execution ID: {execution_id}")
    
    agents_data: List[Dict[str, Any]] = []
    goal = ""
    
    # Retrieve blueprint details and dynamic agents from DB
    async with SessionLocal() as db:
        result = await db.execute(
            select(Blueprint)
            .options(selectinload(Blueprint.agents), selectinload(Blueprint.project))
            .filter(Blueprint.project_id == project_id)
        )
        blueprint = result.scalars().first()
        if not blueprint or not blueprint.agents:
            logger.error(f"Cannot start execution. Blueprint or agents missing for project: {project_id}")
            # Update status to failed
            execution_res = await db.execute(
                select(WorkflowExecution).filter(WorkflowExecution.id == execution_id)
            )
            execution = execution_res.scalars().first()
            if execution:
                execution.status = "Failed"
                execution.error_log = "Project blueprint or agents not found."
                execution.completed_at = datetime.now(timezone.utc)
                await db.commit()
            return
            
        goal = blueprint.project.goal
        # Map DB Agent objects to structured dictionaries
        for agent in blueprint.agents:
            agents_data.append({
                "name": agent.name,
                "responsibility": agent.responsibility
            })

    # Build the sequential LangGraph StateGraph dynamically
    workflow = StateGraph(WorkflowState)
    
    # Add nodes dynamically
    for agent_config in agents_data:
        node_name = agent_config["name"]
        workflow.add_node(node_name, make_agent_node(agent_config, execution_id))
        
    # Link nodes sequentially
    # START -> Agent1
    workflow.add_edge(START, agents_data[0]["name"])
    
    # Agent_i -> Agent_i+1
    for i in range(len(agents_data) - 1):
        workflow.add_edge(agents_data[i]["name"], agents_data[i+1]["name"])
        
    # Agent_N -> END
    workflow.add_edge(agents_data[-1]["name"], END)
    
    # Compile graph
    compiled_graph = workflow.compile()
    
    # Initial state declaration
    initial_state: WorkflowState = {
        "project_id": project_id,
        "goal": goal,
        "agents": agents_data,
        "outputs": {},
        "current_agent_index": 0,
        "execution_id": execution_id
    }
    
    # Run graph execution within error boundary (Feature 7)
    try:
        await compiled_graph.ainvoke(initial_state)
        
        # On success, update status to Completed and decrement user credits by 1
        async with SessionLocal() as db:
            exec_res = await db.execute(
                select(WorkflowExecution).filter(WorkflowExecution.id == execution_id)
            )
            execution = exec_res.scalars().first()
            if execution:
                execution.status = "Completed"
                execution.progress_percentage = 100
                execution.completed_at = datetime.now(timezone.utc)
                
                # Fetch project to get user_id and update credits
                from app.models.project import Project
                from app.models.user import User
                proj_res = await db.execute(
                    select(Project).filter(Project.id == project_id)
                )
                project = proj_res.scalars().first()
                if project:
                    user_res = await db.execute(
                        select(User).filter(User.id == project.user_id)
                    )
                    user = user_res.scalars().first()
                    if user:
                        user.credits = max(0, user.credits - 1)
                        logger.info(f"Execution {execution_id} succeeded. Decremented user {user.id} credits to {user.credits}")
                
                await db.commit()
        logger.info(f"LangGraph execution {execution_id} completed successfully.")
        
    except Exception as e:
        logger.error(f"LangGraph workflow execution {execution_id} failed: {e}")
        # On failure, update status to Failed and log exception details
        async with SessionLocal() as db:
            exec_res = await db.execute(
                select(WorkflowExecution).filter(WorkflowExecution.id == execution_id)
            )
            execution = exec_res.scalars().first()
            if execution:
                execution.status = "Failed"
                execution.error_log = str(e)
                execution.completed_at = datetime.now(timezone.utc)
                await db.commit()
