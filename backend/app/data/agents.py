from ..models import Agent, AgentSpec, AgentStatus
from ..config import NODE_SSH_CONFIG, settings

# Map agent IDs to node names for host resolution
_AGENT_NODE_MAP = {
    "nova": "k3s-cp-1",
    "atlas": "k3s-cp-2",
    "sentinel": "k3s-cp-3",
    "forge": "k3s-worker-1",
}


def _resolve_host(node_name: str) -> str:
    cfg = NODE_SSH_CONFIG.get(node_name, {})
    return cfg.get("ip", "127.0.0.1")


def _resolve_user(node_name: str) -> str:
    cfg = NODE_SSH_CONFIG.get(node_name, {})
    return cfg.get("user", "admin")


# Pre-configured agents - each runs on a specific VM
AGENTS = [
    Agent(
        id="nova",
        name="Nova",
        spec=AgentSpec.frontend,
        description="Frontend specialist. Fast, creative, loves clean UI.",
        skills=["React", "TypeScript", "Tailwind", "Framer Motion", "Next.js"],
        color="#06b6d4",
        vm_host=_resolve_host("k3s-cp-1"),
        ssh_user=_resolve_user("k3s-cp-1"),
        working_directory=settings.PROJECTS_BASE_PATH,
        status=AgentStatus.available,
        jobs_completed=0,
        success_rate=100.0,
    ),
    Agent(
        id="atlas",
        name="Atlas",
        spec=AgentSpec.backend,
        description="Backend architect. Solid APIs, clean data models.",
        skills=["Python", "FastAPI", "PostgreSQL", "Redis", "SQLAlchemy"],
        color="#8b5cf6",
        vm_host=_resolve_host("k3s-cp-2"),
        ssh_user=_resolve_user("k3s-cp-2"),
        working_directory=settings.PROJECTS_BASE_PATH,
        status=AgentStatus.available,
        jobs_completed=0,
        success_rate=100.0,
    ),
    Agent(
        id="sentinel",
        name="Sentinel",
        spec=AgentSpec.reviewer,
        description="Code reviewer. Catches bugs, enforces standards.",
        skills=["Code Review", "Security", "Testing", "Documentation"],
        color="#22c55e",
        vm_host=_resolve_host("k3s-cp-3"),
        ssh_user=_resolve_user("k3s-cp-3"),
        working_directory=settings.PROJECTS_BASE_PATH,
        status=AgentStatus.available,
        jobs_completed=0,
        success_rate=100.0,
    ),
    Agent(
        id="forge",
        name="Forge",
        spec=AgentSpec.devops,
        description="Infrastructure specialist. Docker, K8s, CI/CD.",
        skills=["Docker", "Kubernetes", "GitHub Actions", "Terraform", "Helm"],
        color="#f59e0b",
        vm_host=_resolve_host("k3s-worker-1"),
        ssh_user=_resolve_user("k3s-worker-1"),
        working_directory=settings.PROJECTS_BASE_PATH,
        status=AgentStatus.available,
        jobs_completed=0,
        success_rate=100.0,
    ),
]


def get_agent(agent_id: str) -> Agent | None:
    return next((a for a in AGENTS if a.id == agent_id), None)


def get_all_agents() -> list[Agent]:
    return AGENTS


def update_agent_status(agent_id: str, status: AgentStatus, job_id: str = None):
    agent = get_agent(agent_id)
    if agent:
        agent.status = status
        agent.current_job_id = job_id
