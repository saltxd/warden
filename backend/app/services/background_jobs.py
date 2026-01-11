import asyncio
import logging
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional, Callable, Awaitable
import time

logger = logging.getLogger(__name__)


class JobStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class BackgroundJob:
    id: str
    task: str
    status: JobStatus
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    result: Optional[str] = None
    error: Optional[str] = None
    output_lines: list[str] = field(default_factory=list)


# In-memory job store
BACKGROUND_JOBS: dict[str, BackgroundJob] = {}

# Keywords that suggest long-running operations
LONG_OPERATION_KEYWORDS = [
    "update",
    "upgrade",
    "restart",
    "deploy",
    "install",
    "reboot",
    "backup",
    "restore",
    "migrate",
    "rebuild",
    "sync",
    "pull",
    "push",
    "clone",
    "build",
    "compile",
    "helm",
    "kubectl apply",
    "docker-compose up",
    "docker build",
    "apt-get",
    "yum",
    "dnf",
    "pacman",
    "pip install",
    "npm install",
    "argocd sync",
]


def is_long_operation(message: str) -> bool:
    """Check if message suggests a long-running operation."""
    message_lower = message.lower()
    return any(keyword in message_lower for keyword in LONG_OPERATION_KEYWORDS)


def create_job(task: str) -> BackgroundJob:
    """Create a new background job."""
    job_id = f"warden_{uuid.uuid4().hex[:6]}"
    job = BackgroundJob(
        id=job_id,
        task=task,
        status=JobStatus.PENDING,
        created_at=datetime.now(),
    )
    BACKGROUND_JOBS[job_id] = job
    logger.info(f"Created background job {job_id}: {task[:50]}...")
    return job


def get_job(job_id: str) -> Optional[BackgroundJob]:
    """Get a job by ID."""
    return BACKGROUND_JOBS.get(job_id)


def list_jobs(limit: int = 10) -> list[BackgroundJob]:
    """List recent jobs."""
    jobs = sorted(
        BACKGROUND_JOBS.values(),
        key=lambda j: j.created_at,
        reverse=True,
    )
    return jobs[:limit]


def cleanup_old_jobs(max_age_hours: int = 24):
    """Remove jobs older than max_age_hours."""
    cutoff = datetime.now()
    to_remove = []
    for job_id, job in BACKGROUND_JOBS.items():
        age = (cutoff - job.created_at).total_seconds() / 3600
        if age > max_age_hours and job.status in (JobStatus.COMPLETED, JobStatus.FAILED):
            to_remove.append(job_id)

    for job_id in to_remove:
        del BACKGROUND_JOBS[job_id]

    if to_remove:
        logger.info(f"Cleaned up {len(to_remove)} old jobs")


async def run_background_job(
    job: BackgroundJob,
    run_func: Callable[[Callable[[str], Awaitable[None]]], Awaitable[bool]],
    on_complete: Optional[Callable[[BackgroundJob], Awaitable[None]]] = None,
):
    """
    Run a job in the background.

    Args:
        job: The job to run
        run_func: Async function that takes an output callback and returns success bool
        on_complete: Optional callback when job finishes
    """
    job.status = JobStatus.RUNNING
    job.started_at = datetime.now()
    start_time = time.time()

    async def collect_output(line: str):
        job.output_lines.append(line)
        # Keep only last 100 lines to avoid memory issues
        if len(job.output_lines) > 100:
            job.output_lines = job.output_lines[-100:]

    try:
        success = await run_func(collect_output)
        job.status = JobStatus.COMPLETED if success else JobStatus.FAILED
        job.result = "\n".join(job.output_lines[-20:])  # Keep last 20 lines as result
    except Exception as e:
        logger.exception(f"Background job {job.id} failed with exception")
        job.status = JobStatus.FAILED
        job.error = str(e)
    finally:
        job.completed_at = datetime.now()
        duration = int(time.time() - start_time)
        logger.info(f"Background job {job.id} finished: {job.status.value} in {duration}s")

        if on_complete:
            try:
                await on_complete(job)
            except Exception as e:
                logger.exception(f"Error in job completion callback: {e}")
