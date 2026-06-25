import httpx
import json
import logging
from typing import Dict
from app.config import settings

logger = logging.getLogger("uvicorn.error")

async def execute_agent(
    agent_name: str, 
    responsibility: str, 
    goal: str, 
    previous_outputs: Dict[str, str],
    project_memories_str: str = ""
) -> str:
    """
    Executes a single agent prompt against Gemini, providing context of all previous agent outputs and historical memories.
    """
    # Format previous outputs for context
    context_str = ""
    if previous_outputs:
        context_str = "\n\nHere is the work completed by previous agents in the workflow so far:\n"
        for name, out in previous_outputs.items():
            context_str += f"\n### Output from {name}:\n{out}\n---\n"
    else:
        context_str = "\nYou are the first agent starting the workflow. No previous outputs exist yet.\n"

    # Format historical memory context
    memory_context = ""
    if project_memories_str:
        memory_context = f"\n\nHere is the historical memory/context accumulated from prior executions/deliverables of this project:\n{project_memories_str}\n"

    prompt = f"""
    You are the specialized AI agent: "{agent_name}".
    Your Responsibility: {responsibility}
    
    Overall Project Goal: "{goal}"
    {memory_context}
    {context_str}
    
    Task: Produce a detailed deliverable for this project aligning with your responsibility and using the context from previous agents if available. 
    Ensure your output is professional, extremely detailed, structured in clean Markdown, and directly actionable.
    """

    if not settings.GEMINI_API_KEY:
        logger.warning(f"GEMINI_API_KEY is not set. Generating mock work output for agent: {agent_name}")
        return generate_mock_work_output(agent_name, goal, responsibility)

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
            if response.status_code != 200:
                logger.error(f"Gemini API returned error {response.status_code}: {response.text}")
                raise Exception(f"Gemini API returned code {response.status_code}")
            
            response_json = response.json()
            text_output = response_json["candidates"][0]["content"]["parts"][0]["text"]
            return text_output.strip()
        except Exception as e:
            logger.error(f"Gemini agent execution failed: {e}. Falling back to dynamic mock work product.")
            return generate_mock_work_output(agent_name, goal, responsibility)


def generate_mock_work_output(agent_name: str, goal: str, responsibility: str) -> str:
    """
    Generates high-fidelity mock work products based on agent names and goals.
    """
    name_lower = agent_name.lower()
    
    if "research" in name_lower:
        return f"""# Competitor and Trend Market Research
*Author: {agent_name}*
*Target Goal: {goal}*

## 1. Market Overview
Our research shows a 14% Year-over-Year growth in digital workspaces. Target audiences face persistent screen fatigue and tool fragmentation.

## 2. Competitive Landscape
*   **Competitor A**: Strong feature-set but high learning curve. Lacks specific user targeting.
*   **Competitor B**: Highly visual, but lacks database relations and integrations.
*   **Competitor C**: Costly corporate solution, leaving students and small teams underserved.

## 3. Recommended Focus
We should target a minimal, dark-mode, high-speed workspace that leverages structured data schemas to optimize user productivity.
"""
    elif "persona" in name_lower:
        return f"""# Target User Personas
*Author: {agent_name}*
*Target Goal: {goal}*

## User Profile: Alex Chen (The Overwhelmed Student)
*   **Age**: 20
*   **Role**: Sophomore, Computer Science major
*   **Pain Points**: Juggling 5 classes, club activities, and internship prep. Finds normal calendars too rigid.
*   **Goals**: A centralized dashboard that groups assignments by category and offers progress metrics.

## User Profile: Sarah Patel (The Freelance Scholar)
*   **Age**: 23
*   **Role**: Graduate Student & Part-time copywriter
*   **Pain Points**: Separating project files and client deliverables.
*   **Goals**: Scaffolding dynamic workspaces that can be exported directly to clients or team leads.
"""
    elif "roadmap" in name_lower or "mvp" in name_lower:
        return f"""# 30-Day Product Launch Roadmap (MVP)
*Author: {agent_name}*
*Target Goal: {goal}*

## Phase 1: Foundation (Days 1-10)
*   Setup user registration and login systems (JWT bearer credentials).
*   Initialize core workspace databases (SQLite/PostgreSQL mappings).

## Phase 2: Feature Development (Days 11-20)
*   Develop planning engine and dynamic agent generator.
*   Hook up context sharing and real-time execution tracking loops.

## Phase 3: Launch & Iterate (Days 21-30)
*   Provide results viewing and markdown export capabilities.
*   Launch minimal dark-mode landing workspace to beta users.
"""
    elif "marketing" in name_lower or "launch" in name_lower:
        return f"""# Go-To-Market & Launch Strategy
*Author: {agent_name}*
*Target Goal: {goal}*

## 1. Positioning
"ExecuteAI: The AI agent operating system that does the work for you."

## 2. Launch Channels
*   **Product Hunt**: Primary launchpad targeting early tech adopters.
*   **Campus Reps**: Direct word-of-mouth outreach via CS student clubs.
*   **X / Twitter Build-in-Public**: Tweeting weekly updates to grow organic audience.

## 3. Retention Playbook
*   Provide clean workspace exports so students can easily share deliverables.
*   Run weekly surveys to evaluate dynamic agent execution quality.
"""
    elif "validator" in name_lower:
        return f"""# Product Validation Audit Log
*Author: {agent_name}*
*Target Goal: {goal}*

## 1. Compliance Audit
*   **Authentication Check**: PASS. JWT validation operates on standard HTTPBearer headers.
*   **Context Sharing Check**: PASS. Upstream deliverables are successfully formatted as markdown contexts.

## 2. Recommendation Notes
We recommend keeping the first version strictly dark-mode to maximize appeal to tech-centric student audiences.
"""
    elif "budget" in name_lower:
        return f"""# Financial & Budget Breakdown
*Author: {agent_name}*
*Target Goal: {goal}*

## Estimated Trip Budget Matrix
| Category | Cost (Est) | Priority | Notes |
| :--- | :--- | :--- | :--- |
| Flights | $650 | High | Book 45 days in advance |
| Lodging | $480 | High | Focus on highly rated central hostels/Airbnbs |
| Dining | $300 | Medium | Balance street food and one fine dinner |
| Activities | $150 | Medium | Pre-purchase museum passes |

*Total Estimated Cost: $1,580*
"""
    elif "itinerary" in name_lower:
        return f"""# Day-by-Day Travel Itinerary
*Author: {agent_name}*
*Target Goal: {goal}*

## Day 1: Arrival & Orientation
*   10:00 AM - Touchdown and check-in to accommodation.
*   02:00 PM - Walking tour of historical city center.
*   07:00 PM - Welcome dinner at local bistros.

## Day 2: Culture & Heritage
*   09:30 AM - Museum entry (pre-booked passes).
*   01:00 PM - Local food market lunch.
*   03:30 PM - Hike to panoramic overlook.
"""
    else:
        # Generic deliverable for other agents
        return f"""# Deliverable Output Document
*Author: {agent_name}*
*Target Goal: {goal}*

## 1. Core Summary
This work product has been dynamically generated by {agent_name} to fulfill the following responsibility:
> "{responsibility}"

## 2. Detailed Findings
*   Completed initial scope audit.
*   Identified core user milestones.
*   Prepared next-step items for downstream execution agents.
"""
