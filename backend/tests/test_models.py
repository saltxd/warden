"""Tests for data models."""
import pytest
from datetime import datetime


def test_job_status_enum():
    from app.models import JobStatus
    assert JobStatus.queued == "queued"
    assert JobStatus.running == "running"
    assert JobStatus.completed == "completed"
    assert JobStatus.failed == "failed"
    assert JobStatus.cancelled == "cancelled"


def test_node_status_enum():
    from app.models import NodeStatus
    assert NodeStatus.idle == "idle"
    assert NodeStatus.busy == "busy"
    assert NodeStatus.error == "error"
    assert NodeStatus.offline == "offline"


def test_task_status_enum():
    from app.models import TaskStatus
    assert TaskStatus.queued == "queued"
    assert TaskStatus.running == "running"
    assert TaskStatus.complete == "complete"
    assert TaskStatus.failed == "failed"


def test_agent_status_enum():
    from app.models import AgentStatus
    assert AgentStatus.available == "available"
    assert AgentStatus.working == "working"
    assert AgentStatus.offline == "offline"


def test_job_create_model():
    from app.models import JobCreate
    job = JobCreate(
        name="Test Job",
        description="A test job",
        agent_ids=["atlas", "nova"],
        repository="https://example.com/repo",
    )
    assert job.name == "Test Job"
    assert job.agent_ids == ["atlas", "nova"]
    assert job.repository == "https://example.com/repo"


def test_job_create_minimal():
    from app.models import JobCreate
    job = JobCreate(
        name="Minimal",
        description="Just the basics",
        agent_ids=["atlas"],
    )
    assert job.repository is None


def test_job_model():
    from app.models import Job, JobStatus, JobAgent
    job = Job(
        id="job_test123",
        name="Test",
        description="Description",
        agents=[JobAgent(agent_id="atlas", status="waiting", progress=0)],
        status=JobStatus.queued,
        created_at=datetime.utcnow(),
    )
    assert job.id == "job_test123"
    assert job.status == JobStatus.queued
    assert len(job.agents) == 1
    assert job.artifacts == []
    assert job.activity_log == []


def test_task_create_model():
    from app.models import TaskCreate
    task = TaskCreate(
        type="claude-code",
        target="proxmox-0",
        description="Check disk usage",
        proxmox_node="proxmox-0",
    )
    assert task.k3s_node is None


def test_cluster_metrics_model():
    from app.models import ClusterMetrics
    metrics = ClusterMetrics(
        total_cpu_percent=25.5,
        total_ram_used_gb=32.0,
        total_ram_total_gb=64.0,
        total_disk_used_tb=1.5,
        total_disk_total_tb=4.0,
        nodes_online=3,
        nodes_total=4,
        running_tasks=2,
    )
    assert metrics.total_cpu_percent == 25.5
    assert metrics.nodes_online == 3


def test_agent_model():
    from app.models import Agent, AgentSpec, AgentStatus
    agent = Agent(
        id="test-agent",
        name="Test Agent",
        spec=AgentSpec.backend,
        description="A test agent",
        skills=["Python", "FastAPI"],
        color="#8b5cf6",
        vm_host="10.0.0.100",
        ssh_user="testuser",
        working_directory="/tmp/projects",
    )
    assert agent.status == AgentStatus.available
    assert agent.jobs_completed == 0
    assert agent.success_rate == 100.0
    assert agent.current_job_id is None
