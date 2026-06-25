import httpx
import json
import logging
from typing import Any, Dict
from app.config import settings

logger = logging.getLogger("uvicorn.error")

# Standard schema definition for the entire planning blueprint
BLUEPRINT_JSON_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "category": {
            "type": "STRING",
            "description": "High-level category of the project goal (e.g. Startup Launch, Tech Development, Personal Planning)"
        },
        "domain": {
            "type": "STRING",
            "description": "Specific industry or domain of the project goal (e.g. Education, Tech, Productivity, Health)"
        },
        "complexity": {
            "type": "STRING",
            "enum": ["Low", "Medium", "High"],
            "description": "Calculated complexity of the project based on the goal description"
        },
        "estimated_steps": {
            "type": "INTEGER",
            "description": "Estimated steps required to complete the project"
        },
        "deliverables": {
            "type": "ARRAY",
            "items": {"type": "STRING"},
            "description": "Expected deliverables or outputs of the project"
        },
        "agents": {
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "properties": {
                    "name": {
                        "type": "STRING",
                        "description": "Name of the agent (e.g. Research Agent)"
                    },
                    "responsibility": {
                        "type": "STRING",
                        "description": "Primary responsibility of this agent tailored to this project"
                    }
                },
                "required": ["name", "responsibility"]
            },
            "description": "Dynamically generated list of specialized agents recommended for this project"
        }
    },
    "required": ["category", "domain", "complexity", "estimated_steps", "deliverables", "agents"]
}

async def generate_structured_output(prompt: str, response_schema: Dict[str, Any]) -> Dict[str, Any]:
    """
    Core reusable utility to execute a structured LLM query to Gemini.
    """
    if not settings.GEMINI_API_KEY:
        logger.warning("GEMINI_API_KEY is not set. Falling back to dynamic mock generator.")
        return generate_mock_blueprint(prompt)

    api_url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL}:generateContent?key={settings.GEMINI_API_KEY}"
    
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
            "responseSchema": response_schema
        }
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(api_url, json=payload, timeout=30.0)
            if response.status_code != 200:
                logger.error(f"Gemini API returned error {response.status_code}: {response.text}")
                raise Exception(f"Gemini API returned code {response.status_code}")
            
            response_json = response.json()
            text_output = response_json["candidates"][0]["content"]["parts"][0]["text"]
            return json.loads(text_output)
        except Exception as e:
            logger.error(f"Gemini API call failed: {e}. Falling back to dynamic mock data.")
            return generate_mock_blueprint(prompt)

async def analyze_goal_and_create_blueprint(goal: str) -> Dict[str, Any]:
    """
    Creates a full blueprint mapping the user goal using one optimized LLM call.
    """
    prompt = f"""
    You are the ExecuteAI Planning Engine. Analyze the following project goal and generate a comprehensive blueprint.
    
    User Goal: "{goal}"
    
    Categorize the project, determine its main domain, estimate complexity, list the 4-6 specific key deliverables, 
    and design a set of 3-5 dynamic specialized agents (give them name and exact responsibility) to tackle this project.
    
    Return a valid JSON object matching the requested schema.
    """
    return await generate_structured_output(prompt, BLUEPRINT_JSON_SCHEMA)


def generate_mock_blueprint(prompt: str) -> Dict[str, Any]:
    """
    Generates high-fidelity mock blueprints based on the goal keywords to facilitate testing without API keys.
    """
    prompt_lower = prompt.lower()
    
    if "college" in prompt_lower or "productivity" in prompt_lower or "student" in prompt_lower:
        return {
            "category": "Startup Launch",
            "domain": "Education & Productivity",
            "complexity": "High",
            "estimated_steps": 5,
            "deliverables": [
                "Market Competitor Analysis",
                "Student User Personas",
                "MVP Feature Specification",
                "Go-to-Market Strategy",
                "30-Day Launch Roadmap"
            ],
            "agents": [
                {
                    "name": "Research Agent",
                    "responsibility": "Analyze competitor productivity apps and college student needs/trends."
                },
                {
                    "name": "Persona Agent",
                    "responsibility": "Generate detailed student target user archetypes and pain points."
                },
                {
                    "name": "Marketing Agent",
                    "responsibility": "Design acquisition strategies tailored for college campuses."
                },
                {
                    "name": "Validator Agent",
                    "responsibility": "Review product requirements to verify MVP viability."
                }
            ]
        }
    
    elif "travel" in prompt_lower or "budget" in prompt_lower or "itinerary" in prompt_lower or "trip" in prompt_lower:
        return {
            "category": "Personal Planning",
            "domain": "Travel & Leisure",
            "complexity": "Medium",
            "estimated_steps": 4,
            "deliverables": [
                "Detailed Travel Itinerary",
                "Expense & Budget Breakdown",
                "Hotel & Stay Recommendations",
                "Risk & Safety Checklist"
            ],
            "agents": [
                {
                    "name": "Budget Agent",
                    "responsibility": "Tracks estimated expenses, optimizes flight costs, and logs currency conversions."
                },
                {
                    "name": "Itinerary Agent",
                    "responsibility": "Schedules daily site visits, maps transportation nodes, and blocks timing."
                },
                {
                    "name": "Hotel Agent",
                    "responsibility": "Filters local accommodations based on reviews, proximity, and price constraints."
                },
                {
                    "name": "Risk Agent",
                    "responsibility": "Monitors local travel advisories, weather constraints, and health regulations."
                }
            ]
        }

    elif "career" in prompt_lower or "learning" in prompt_lower or "job" in prompt_lower or "skill" in prompt_lower:
        return {
            "category": "Career Development",
            "domain": "Professional Services",
            "complexity": "Medium",
            "estimated_steps": 4,
            "deliverables": [
                "Skill Gap Assessment",
                "Curated Learning Curriculums",
                "Hands-On Project Outlines",
                "Career Progression Evaluation"
            ],
            "agents": [
                {
                    "name": "Roadmap Agent",
                    "responsibility": "Determines chronological milestones to reach target job competencies."
                },
                {
                    "name": "Learning Agent",
                    "responsibility": "Aggregates online documentation, tutorials, and certification materials."
                },
                {
                    "name": "Project Agent",
                    "responsibility": "Scaffolds real-world projects that reinforce target skills."
                },
                {
                    "name": "Evaluation Agent",
                    "responsibility": "Provides test questions and evaluates candidate experience levels."
                }
            ]
        }
        
    else:
        # Default dynamic response for generic goals
        return {
            "category": "Startup Launch",
            "domain": "Generic Services",
            "complexity": "Medium",
            "estimated_steps": 4,
            "deliverables": [
                "Initial Concept Pitch Deck",
                "Target Audience Breakdown",
                "Core Functional Specifications",
                "Milestone Roadmap"
            ],
            "agents": [
                {
                    "name": "Business Agent",
                    "responsibility": "Refines the business model canvas and monitors monetization paths."
                },
                {
                    "name": "UX Research Agent",
                    "responsibility": "Maps target user journeys and maps pain points."
                },
                {
                    "name": "Technical Agent",
                    "responsibility": "Recommends server architecture and technology stacks."
                }
            ]
        }
