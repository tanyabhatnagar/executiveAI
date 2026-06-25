from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.database.session import get_db
from app.schemas.blueprints import BlueprintResponseSchema, BlueprintUpdateSchema
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.models.project import Project
from app.models.blueprint import Blueprint, Deliverable, Agent
from app.services.ai.gemini_service import analyze_goal_and_create_blueprint

router = APIRouter(prefix="/projects", tags=["blueprints"])

@router.post("/{project_id}/blueprint/generate", response_model=BlueprintResponseSchema, status_code=status.HTTP_201_CREATED)
async def generate_blueprint(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Fetch project and verify ownership
    result = await db.execute(
        select(Project).filter(Project.id == project_id, Project.user_id == current_user.id)
    )
    project = result.scalars().first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Check if blueprint already exists, and if so, delete it to allow clean regeneration
    bp_result = await db.execute(
        select(Blueprint).filter(Blueprint.project_id == project_id)
    )
    existing_bp = bp_result.scalars().first()
    if existing_bp:
        await db.delete(existing_bp)
        await db.commit()
    
    # Trigger AI analysis
    try:
        blueprint_data = await analyze_goal_and_create_blueprint(project.goal)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI generation failed: {str(e)}"
        )
    
    # Save the new blueprint
    new_bp = Blueprint(
        project_id=project.id,
        category=blueprint_data["category"],
        domain=blueprint_data["domain"],
        complexity=blueprint_data["complexity"],
        estimated_steps=blueprint_data["estimated_steps"]
    )
    db.add(new_bp)
    await db.flush()  # Retrieve new_bp.id
    
    # Save generated deliverables
    for deliv_name in blueprint_data["deliverables"]:
        db_deliv = Deliverable(
            blueprint_id=new_bp.id,
            name=deliv_name
        )
        db.add(db_deliv)
        
    # Save generated agents
    for agent_data in blueprint_data["agents"]:
        db_agent = Agent(
            blueprint_id=new_bp.id,
            name=agent_data["name"],
            responsibility=agent_data["responsibility"],
            status="Pending"
        )
        db.add(db_agent)
        
    await db.commit()
    
    # Reload fully with relationships loaded for output validation
    final_result = await db.execute(
        select(Blueprint)
        .options(selectinload(Blueprint.deliverables), selectinload(Blueprint.agents))
        .filter(Blueprint.id == new_bp.id)
    )
    return final_result.scalars().first()

@router.get("/{project_id}/blueprint", response_model=BlueprintResponseSchema)
async def get_blueprint(
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
        
    # Fetch blueprint
    result = await db.execute(
        select(Blueprint)
        .options(selectinload(Blueprint.deliverables), selectinload(Blueprint.agents))
        .filter(Blueprint.project_id == project_id)
    )
    blueprint = result.scalars().first()
    if not blueprint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Blueprint not generated yet"
        )
    return blueprint

@router.put("/{project_id}/blueprint", response_model=BlueprintResponseSchema)
async def update_blueprint(
    project_id: str,
    blueprint_data: BlueprintUpdateSchema,
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

    # Fetch existing blueprint with agents and deliverables loaded
    bp_result = await db.execute(
        select(Blueprint)
        .options(selectinload(Blueprint.deliverables), selectinload(Blueprint.agents))
        .filter(Blueprint.project_id == project_id)
    )
    blueprint = bp_result.scalars().first()
    if not blueprint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Blueprint not generated yet"
        )

    # Update metadata fields
    blueprint.category = blueprint_data.category
    blueprint.domain = blueprint_data.domain
    blueprint.complexity = blueprint_data.complexity
    blueprint.estimated_steps = blueprint_data.estimated_steps

    # Sync deliverables
    existing_delivs = {d.id: d for d in blueprint.deliverables}
    input_deliv_ids = {d.id for d in blueprint_data.deliverables if d.id}

    # Delete missing
    for d_id, d_obj in list(existing_delivs.items()):
        if d_id not in input_deliv_ids:
            await db.delete(d_obj)

    # Update existing or add new
    for d_in in blueprint_data.deliverables:
        if d_in.id and d_in.id in existing_delivs:
            existing_delivs[d_in.id].name = d_in.name
        else:
            new_d = Deliverable(
                blueprint_id=blueprint.id,
                name=d_in.name
            )
            db.add(new_d)

    # Sync agents
    existing_agents = {a.id: a for a in blueprint.agents}
    input_agent_ids = {a.id for a in blueprint_data.agents if a.id}

    # Delete missing
    for a_id, a_obj in list(existing_agents.items()):
        if a_id not in input_agent_ids:
            await db.delete(a_obj)

    # Update existing or add new
    for a_in in blueprint_data.agents:
        if a_in.id and a_in.id in existing_agents:
            existing_agents[a_in.id].name = a_in.name
            existing_agents[a_in.id].responsibility = a_in.responsibility
        else:
            new_a = Agent(
                blueprint_id=blueprint.id,
                name=a_in.name,
                responsibility=a_in.responsibility,
                status="Pending"
            )
            db.add(new_a)

    await db.commit()

    # Reload blueprint with relationships fully populated to return
    final_result = await db.execute(
        select(Blueprint)
        .options(selectinload(Blueprint.deliverables), selectinload(Blueprint.agents))
        .filter(Blueprint.id == blueprint.id)
    )
    return final_result.scalars().first()
