from fastapi import APIRouter, HTTPException
from typing import List
from ..models import Agent
from ..data.agents import get_all_agents, get_agent

router = APIRouter(prefix="/agents", tags=["agents"])


@router.get("", response_model=List[Agent])
async def list_agents():
    """Get all available agents."""
    return get_all_agents()


@router.get("/{agent_id}", response_model=Agent)
async def get_agent_detail(agent_id: str):
    """Get a specific agent."""
    agent = get_agent(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent
