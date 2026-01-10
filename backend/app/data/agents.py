from ..models import Agent, AgentSpec, AgentStatus

# Pre-configured agents - each runs on a specific VM
AGENTS = [
    Agent(
        id="nova",
        name="Nova",
        spec=AgentSpec.frontend,
        description="Frontend specialist. Fast, creative, loves clean UI.",
        skills=["React", "TypeScript", "Tailwind", "Framer Motion", "Next.js"],
        color="#06b6d4",  # Cyan
        vm_host="10.0.1.10",  # k3s-cp-1
        ssh_user="admin",
        working_directory="/home/admin/projects",
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
        color="#8b5cf6",  # Purple
        vm_host="10.0.1.11",  # k3s-cp-2
        ssh_user="admin",
        working_directory="/home/admin/projects",
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
        color="#22c55e",  # Green
        vm_host="10.0.1.12",  # k3s-cp-3
        ssh_user="admin",
        working_directory="/home/admin/projects",
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
        color="#f59e0b",  # Amber
        vm_host="10.0.1.14",  # k3s-worker-1
        ssh_user="admin",
        working_directory="/home/admin/projects",
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
