"""Tests for agent data layer and prompts."""
import pytest


def test_get_all_agents():
    from app.data.agents import get_all_agents
    agents = get_all_agents()
    assert len(agents) == 4
    ids = [a.id for a in agents]
    assert "nova" in ids
    assert "atlas" in ids
    assert "sentinel" in ids
    assert "forge" in ids


def test_get_agent():
    from app.data.agents import get_agent
    agent = get_agent("atlas")
    assert agent is not None
    assert agent.name == "Atlas"
    assert agent.spec == "backend"


def test_get_agent_not_found():
    from app.data.agents import get_agent
    agent = get_agent("nonexistent")
    assert agent is None


def test_update_agent_status():
    from app.data.agents import get_agent, update_agent_status
    from app.models import AgentStatus

    # Set to working
    update_agent_status("atlas", AgentStatus.working, "job_test")
    agent = get_agent("atlas")
    assert agent.status == AgentStatus.working
    assert agent.current_job_id == "job_test"

    # Reset
    update_agent_status("atlas", AgentStatus.available)
    agent = get_agent("atlas")
    assert agent.status == AgentStatus.available
    assert agent.current_job_id is None


def test_agent_prompt_generation():
    from app.services.agent_prompts import get_agent_prompt

    prompt = get_agent_prompt("atlas", "Test Project", "Build a REST API")
    assert "Atlas" in prompt
    assert "Test Project" in prompt
    assert "Build a REST API" in prompt
    assert "backend" in prompt.lower()


def test_agent_prompt_all_agents():
    from app.services.agent_prompts import get_agent_prompt

    for agent_id in ["atlas", "nova", "sentinel", "forge"]:
        prompt = get_agent_prompt(agent_id, "Test", "Description")
        assert len(prompt) > 50
        assert "Test" in prompt
        assert "Description" in prompt


def test_agent_prompt_fallback():
    from app.services.agent_prompts import get_agent_prompt

    prompt = get_agent_prompt("unknown_agent", "Test", "Desc")
    assert "Test" in prompt
    assert "Desc" in prompt


def test_agent_execution_order():
    """Verify AGENT_ORDER matches actual agent IDs."""
    from app.routers.jobs import AGENT_ORDER
    from app.data.agents import get_all_agents

    all_ids = {a.id for a in get_all_agents()}
    for agent_id in AGENT_ORDER:
        assert agent_id in all_ids, f"AGENT_ORDER contains '{agent_id}' which is not a valid agent"
