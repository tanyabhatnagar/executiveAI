import logging
import httpx
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.config import settings
from app.models.reliability import ProjectMemory

logger = logging.getLogger("uvicorn.error")

async def summarize_memory(content: str, memory_type: str) -> str:
    """
    Summarizes content using Gemini or fallbacks to dynamic summary.
    Generates a concise 1-2 paragraph description (100-150 words).
    """
    if not settings.GEMINI_API_KEY:
        logger.warning("GEMINI_API_KEY not set. Generating mock summary for memory.")
        return generate_mock_summary(content, memory_type)

    prompt = f"""
    You are an AI memory summarization system.
    Please summarize the following "{memory_type}" work product into a concise, high-density summary of about 100-150 words.
    Highlight key objectives, outputs, decisions, and structures, but eliminate fluff so it can be efficiently injected as context for future runs.
    
    Work Product Content:
    {content}
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
            response = await client.post(api_url, json=payload, timeout=25.0)
            if response.status_code == 200:
                res_json = response.json()
                summary_text = res_json["candidates"][0]["content"]["parts"][0]["text"]
                return summary_text.strip()
            else:
                logger.error(f"Gemini summarization failed with status {response.status_code}: {response.text}")
                return generate_mock_summary(content, memory_type)
        except Exception as e:
            logger.error(f"Error calling Gemini summarizer: {e}")
            return generate_mock_summary(content, memory_type)


def generate_mock_summary(content: str, memory_type: str) -> str:
    """
    Fallback dynamic mock summary generator.
    """
    lines = [line.strip() for line in content.split("\n") if line.strip()]
    headers = [l for l in lines if l.startswith("#")]
    
    header_list = []
    for h in headers[:4]:
        clean_h = h.lstrip("#").strip()
        header_list.append(clean_h)
        
    sections = ", ".join(header_list) if header_list else "general project notes"
    return f"This is a high-density summary of the '{memory_type}' agent output. It outlines the core objectives, focuses on major components like {sections}, and details actionable results to maintain consistency across executions."


async def store_memory(
    db: AsyncSession,
    project_id: str,
    memory_type: str,
    content: str,
    summary: Optional[str] = None
) -> ProjectMemory:
    """
    Stores a new memory entry for a project. Summarizes content if not provided.
    """
    if not summary:
        summary = await summarize_memory(content, memory_type)
        
    db_memory = ProjectMemory(
        project_id=project_id,
        memory_type=memory_type,
        content=content,
        summary=summary
    )
    db.add(db_memory)
    await db.commit()
    await db.refresh(db_memory)
    return db_memory


async def retrieve_memory(
    db: AsyncSession,
    project_id: str,
    memory_type: Optional[str] = None
) -> List[ProjectMemory]:
    """
    Retrieves all memories for a project, optionally filtered by memory_type.
    """
    query = select(ProjectMemory).filter(ProjectMemory.project_id == project_id)
    if memory_type:
        query = query.filter(ProjectMemory.memory_type == memory_type)
    
    # Order chronologically so timelines read correctly
    query = query.order_by(ProjectMemory.created_at.asc())
    
    result = await db.execute(query)
    return list(result.scalars().all())


async def update_memory(
    db: AsyncSession,
    memory_id: str,
    content: str,
    summary: Optional[str] = None
) -> Optional[ProjectMemory]:
    """
    Updates an existing memory record. Re-summarizes if content changes and no summary is provided.
    """
    result = await db.execute(
        select(ProjectMemory).filter(ProjectMemory.id == memory_id)
    )
    db_memory = result.scalars().first()
    if not db_memory:
        return None
        
    db_memory.content = content
    if summary:
        db_memory.summary = summary
    else:
        db_memory.summary = await summarize_memory(content, db_memory.memory_type)
        
    await db.commit()
    await db.refresh(db_memory)
    return db_memory
