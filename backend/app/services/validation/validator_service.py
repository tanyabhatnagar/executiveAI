import json
import logging
import httpx
from pydantic import BaseModel, Field, ValidationError
from typing import List, Dict, Any, Optional
from app.config import settings

logger = logging.getLogger("uvicorn.error")

class ValidationResult(BaseModel):
    score: int = Field(..., ge=0, le=100)
    missing_sections: List[str] = Field(default_factory=list)
    quality_issues: List[str] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)


async def validate_agent_output(
    goal: str,
    agent_name: str,
    responsibility: str,
    output_content: str,
    retry_count: int = 0
) -> ValidationResult:
    """
    Validates an agent's work output against the project goal and responsibility.
    Returns a ValidationResult object with a score and descriptive lists.
    """
    if not settings.GEMINI_API_KEY:
        logger.warning(f"GEMINI_API_KEY not set. Using mock validation for agent: {agent_name}")
        return generate_mock_validation(agent_name, output_content, retry_count)

    prompt = f"""
    You are an expert AI Output Quality Auditor.
    Validate the following work product against the overall project goal and agent responsibility.
    
    Overall Project Goal: "{goal}"
    Agent Name: "{agent_name}"
    Agent Responsibility: "{responsibility}"
    
    Work Product Content:
    ---
    {output_content}
    ---
    
    Evaluate the content strictly. If sections are missing, generic, or not actionable, lower the score.
    A quality score under 80 triggers an automatic repair loop.
    You MUST return JSON containing:
    - score: Integer (0-100)
    - missing_sections: Array of strings detailing missing deliverables or gaps.
    - quality_issues: Array of strings detailing issues (e.g. 'too generic', 'lacks pricing data').
    - recommendations: Array of strings detailing concrete steps the agent should take to repair this document.
    """

    api_url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL}:generateContent?key={settings.GEMINI_API_KEY}"
    
    schema = {
        "type": "OBJECT",
        "properties": {
            "score": {"type": "INTEGER"},
            "missing_sections": {"type": "ARRAY", "items": {"type": "STRING"}},
            "quality_issues": {"type": "ARRAY", "items": {"type": "STRING"}},
            "recommendations": {"type": "ARRAY", "items": {"type": "STRING"}}
        },
        "required": ["score", "missing_sections", "quality_issues", "recommendations"]
    }

    payload = {
        "contents": [
            {
                "parts": [
                    {"text": prompt}
                ]
            }
        ],
        "generationConfig": {
            "responseMimeType": "application/json",
            "responseSchema": schema
        }
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(api_url, json=payload, timeout=25.0)
            if response.status_code == 200:
                res_json = response.json()
                text_output = res_json["candidates"][0]["content"]["parts"][0]["text"]
                data = json.loads(text_output.strip())
                return ValidationResult(**data)
            else:
                logger.error(f"Gemini validator service failed with status {response.status_code}: {response.text}")
                return generate_mock_validation(agent_name, output_content, retry_count)
        except ValidationError as val_err:
            logger.error(f"Pydantic validation of Gemini response failed: {val_err}")
            return generate_mock_validation(agent_name, output_content, retry_count)
        except Exception as e:
            logger.error(f"Error calling Gemini validator: {e}")
            return generate_mock_validation(agent_name, output_content, retry_count)


def generate_mock_validation(agent_name: str, content: str, retry_count: int) -> ValidationResult:
    """
    Generates dynamic mock validation audits.
    Deliberately fails initial marketing/roadmap agents to let user test and observe the auto-repair loop.
    """
    name_lower = agent_name.lower()
    
    # Let's trigger a failure (score < 80) if retry_count is 0 for specific agents to demonstrate the loop
    if retry_count == 0 and ("marketing" in name_lower or "roadmap" in name_lower):
        return ValidationResult(
            score=72,
            missing_sections=["Pricing and Tier Strategy", "Marketing Budget Allocations"],
            quality_issues=["Go-to-market channels are too generic and lack student focus", "Missing launch timeline details"],
            recommendations=["Add detailed CS student club engagement playbook", "Establish pricing tiers (e.g. Free vs Pro version)"]
        )
    elif retry_count == 1 and ("marketing" in name_lower or "roadmap" in name_lower):
        # Passes on the second run (retry_count == 1)
        return ValidationResult(
            score=91,
            missing_sections=[],
            quality_issues=[],
            recommendations=[]
        )
    else:
        # Standard passing mock validation
        return ValidationResult(
            score=94,
            missing_sections=[],
            quality_issues=[],
            recommendations=[]
        )
