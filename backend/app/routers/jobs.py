from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import Response
from typing import List, Dict
from datetime import datetime
import asyncio
import uuid
import logging
import base64

from ..models import Job, JobCreate, JobStatus, JobAgent
from ..data.agents import get_agent, update_agent_status, AgentStatus
from ..services.ssh_service import SSHService
from ..services.claude_runner import ClaudeCodeRunner
from ..services.agent_prompts import get_agent_prompt
from ..config import settings

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

router = APIRouter(prefix="/jobs", tags=["jobs"])

# In-memory job store
JOBS: Dict[str, Job] = {}

# WebSocket connections for job updates
job_connections: Dict[str, List[WebSocket]] = {}

# Track running previews
PREVIEWS: Dict[str, dict] = {}

# Execution order for agents (backend first, then frontend, then review, then devops)
AGENT_ORDER = ["atlas", "nova", "sentinel", "forge"]


@router.get("", response_model=List[Job])
async def list_jobs():
    """Get all jobs."""
    return sorted(JOBS.values(), key=lambda j: j.created_at, reverse=True)


@router.get("/{job_id}", response_model=Job)
async def get_job(job_id: str):
    """Get a specific job."""
    if job_id not in JOBS:
        raise HTTPException(status_code=404, detail="Job not found")
    return JOBS[job_id]


@router.post("", response_model=Job)
async def create_job(job_data: JobCreate):
    """Create and start a new job."""
    job_id = f"job_{uuid.uuid4().hex[:8]}"

    # Validate agents
    job_agents = []
    for agent_id in job_data.agent_ids:
        agent = get_agent(agent_id)
        if not agent:
            raise HTTPException(status_code=400, detail=f"Agent {agent_id} not found")
        job_agents.append(
            JobAgent(
                agent_id=agent_id,
                status="waiting",
                progress=0,
            )
        )

    job = Job(
        id=job_id,
        name=job_data.name,
        description=job_data.description,
        agents=job_agents,
        status=JobStatus.queued,
        created_at=datetime.utcnow(),
        repository=job_data.repository,
        activity_log=[
            {
                "timestamp": datetime.utcnow().isoformat(),
                "agent_id": "system",
                "message": "Job created",
            }
        ],
    )

    JOBS[job_id] = job

    # Start execution in background
    asyncio.create_task(execute_job(job_id))

    return job


@router.post("/{job_id}/cancel")
async def cancel_job(job_id: str):
    """Cancel a running job."""
    if job_id not in JOBS:
        raise HTTPException(status_code=404, detail="Job not found")

    job = JOBS[job_id]
    job.status = JobStatus.cancelled

    # Release agents
    for job_agent in job.agents:
        update_agent_status(job_agent.agent_id, AgentStatus.available)

    await broadcast_job_update(job_id, {"type": "cancelled", "job": job.model_dump()})

    return {"status": "cancelled"}


@router.websocket("/{job_id}/ws")
async def job_websocket(websocket: WebSocket, job_id: str):
    """WebSocket for real-time job updates."""
    await websocket.accept()

    if job_id not in job_connections:
        job_connections[job_id] = []
    job_connections[job_id].append(websocket)

    try:
        # Send current state
        if job_id in JOBS:
            await websocket.send_json({"type": "state", "job": JOBS[job_id].model_dump()})

        # Keep alive
        while True:
            try:
                await asyncio.wait_for(websocket.receive_text(), timeout=30)
            except asyncio.TimeoutError:
                # Send ping to keep connection alive
                await websocket.send_json({"type": "ping"})
    except WebSocketDisconnect:
        if job_id in job_connections:
            job_connections[job_id].remove(websocket)


async def broadcast_job_update(job_id: str, data: dict):
    """Send update to all connected clients."""
    if job_id in job_connections:
        dead_connections = []
        for ws in job_connections[job_id]:
            try:
                await ws.send_json(data)
            except Exception:
                dead_connections.append(ws)

        # Clean up dead connections
        for ws in dead_connections:
            job_connections[job_id].remove(ws)


async def log_activity(job_id: str, agent_id: str, message: str):
    """Log activity and broadcast update."""
    if job_id not in JOBS:
        return

    timestamp = datetime.utcnow().isoformat()

    JOBS[job_id].activity_log.append(
        {
            "timestamp": timestamp,
            "agent_id": agent_id,
            "message": message,
        }
    )

    await broadcast_job_update(
        job_id,
        {
            "type": "activity",
            "timestamp": timestamp,
            "agent_id": agent_id,
            "message": message,
        },
    )


async def execute_job(job_id: str):
    """Execute a job by running agents sequentially on the build server."""
    job = JOBS[job_id]
    job.status = JobStatus.running
    job.started_at = datetime.utcnow()

    await broadcast_job_update(job_id, {"type": "started", "job": job.model_dump()})
    await log_activity(job_id, "system", "Job execution started")

    # Get selected agent IDs in correct execution order
    selected_agents = [ja.agent_id for ja in job.agents]
    ordered_agents = [a for a in AGENT_ORDER if a in selected_agents]
    # Add any agents not in the predefined order at the end
    for agent_id in selected_agents:
        if agent_id not in ordered_agents:
            ordered_agents.append(agent_id)

    workspace = f"{settings.PROJECTS_BASE_PATH}/{job_id}"

    try:
        # Connect to build server
        await log_activity(
            job_id, "system", f"Connecting to build server {settings.BUILD_SERVER_HOST}..."
        )

        async with SSHService(
            host=settings.BUILD_SERVER_HOST,
            username=settings.BUILD_SERVER_USER,
            port=settings.BUILD_SERVER_PORT,
        ) as ssh:

            await log_activity(
                job_id, "system", f"Connected to build server {settings.BUILD_SERVER_HOST}"
            )

            # Create Claude runner
            claude = ClaudeCodeRunner(ssh)

            # Create workspace
            if not await claude.setup_workspace(workspace):
                raise Exception(f"Failed to create workspace: {workspace}")
            await log_activity(job_id, "system", f"Created workspace: {workspace}")

            # Run each agent sequentially
            total_agents = len(ordered_agents)
            for idx, agent_id in enumerate(ordered_agents):
                # Check if job was cancelled
                if JOBS[job_id].status == JobStatus.cancelled:
                    await log_activity(job_id, "system", "Job was cancelled")
                    break

                # Find the job agent record
                job_agent = next(ja for ja in job.agents if ja.agent_id == agent_id)
                agent = get_agent(agent_id)

                # Update status
                job_agent.status = "working"
                update_agent_status(agent_id, AgentStatus.working, job_id)

                await broadcast_job_update(
                    job_id,
                    {
                        "type": "agent_started",
                        "agent_id": agent_id,
                        "job": job.model_dump(),
                    },
                )

                await log_activity(job_id, agent_id, f"{agent.name} starting work...")

                # Build prompt
                prompt = get_agent_prompt(agent_id, job.name, job.description)

                # Define output callback
                async def on_output(line: str, aid=agent_id):
                    await log_activity(job_id, aid, line)

                # Run Claude Code
                try:
                    success = await claude.run_agent(
                        workspace=workspace,
                        prompt=prompt,
                        on_output=on_output,
                        timeout=settings.AGENT_TIMEOUT,
                    )
                except Exception as e:
                    logger.exception(f"Agent {agent_id} failed with exception")
                    success = False
                    await log_activity(job_id, agent_id, f"Error: {str(e)}")

                # Update status
                if success:
                    job_agent.status = "done"
                    job_agent.progress = 100
                    update_agent_status(agent_id, AgentStatus.available)
                    await log_activity(job_id, agent_id, f"{agent.name} completed successfully")
                else:
                    job_agent.status = "error"
                    update_agent_status(agent_id, AgentStatus.available)
                    await log_activity(job_id, agent_id, f"{agent.name} failed")

                    # Stop on first failure
                    job.status = JobStatus.failed
                    break

                # Update overall progress
                job.progress = int(((idx + 1) / total_agents) * 100)
                await broadcast_job_update(
                    job_id,
                    {
                        "type": "progress",
                        "progress": job.progress,
                        "job": job.model_dump(),
                    },
                )

            # List created files
            if job.status != JobStatus.failed and job.status != JobStatus.cancelled:
                files = await claude.list_files(workspace)
                if files:
                    await log_activity(job_id, "system", f"Created {len(files)} files")
                    job.artifacts = files

                job.status = JobStatus.completed
                job.progress = 100

    except Exception as e:
        logger.exception(f"Job {job_id} failed with error")
        job.status = JobStatus.failed
        await log_activity(job_id, "system", f"Error: {str(e)}")

        # Release all agents
        for job_agent in job.agents:
            update_agent_status(job_agent.agent_id, AgentStatus.available)

    job.completed_at = datetime.utcnow()
    await broadcast_job_update(job_id, {"type": "completed", "job": job.model_dump()})
    await log_activity(job_id, "system", f"Job {job.status.value}")


# =============================================================================
# File Browser Endpoints
# =============================================================================


@router.get("/{job_id}/files")
async def get_job_files(job_id: str):
    """Get file tree for a completed job."""
    if job_id not in JOBS:
        raise HTTPException(status_code=404, detail="Job not found")

    workspace = f"{settings.PROJECTS_BASE_PATH}/{job_id}"

    try:
        async with SSHService(
            host=settings.BUILD_SERVER_HOST,
            username=settings.BUILD_SERVER_USER,
            port=settings.BUILD_SERVER_PORT,
        ) as ssh:
            # Get file tree excluding common junk
            stdout, _, code = await ssh.run(
                f"find {workspace} -type f "
                f"-not -path '*/node_modules/*' "
                f"-not -path '*/.git/*' "
                f"-not -path '*/__pycache__/*' "
                f"-not -path '*/.venv/*' "
                f"-not -name '*.pyc' "
                f"| sort",
                timeout=30,
            )

            if code != 0:
                return {"files": [], "workspace": workspace}

            files = []
            for path in stdout.strip().split("\n"):
                if path:
                    relative = path.replace(f"{workspace}/", "")
                    files.append(
                        {
                            "path": relative,
                            "full_path": path,
                            "name": path.split("/")[-1],
                            "extension": path.split(".")[-1] if "." in path else None,
                        }
                    )

            return {"files": files, "workspace": workspace}
    except Exception as e:
        logger.error(f"Error getting files: {e}")
        return {"files": [], "error": str(e)}


@router.get("/{job_id}/files/{file_path:path}")
async def get_file_content(job_id: str, file_path: str):
    """Get content of a specific file."""
    if job_id not in JOBS:
        raise HTTPException(status_code=404, detail="Job not found")

    workspace = f"{settings.PROJECTS_BASE_PATH}/{job_id}"
    full_path = f"{workspace}/{file_path}"

    try:
        async with SSHService(
            host=settings.BUILD_SERVER_HOST,
            username=settings.BUILD_SERVER_USER,
            port=settings.BUILD_SERVER_PORT,
        ) as ssh:
            stdout, stderr, code = await ssh.run(f"cat '{full_path}'", timeout=10)

            if code != 0:
                raise HTTPException(status_code=404, detail="File not found")

            # Detect language from extension
            ext_to_lang = {
                "py": "python",
                "ts": "typescript",
                "tsx": "typescript",
                "js": "javascript",
                "jsx": "javascript",
                "json": "json",
                "md": "markdown",
                "yaml": "yaml",
                "yml": "yaml",
                "html": "html",
                "css": "css",
                "sh": "bash",
                "txt": "text",
                "toml": "toml",
                "cfg": "ini",
                "ini": "ini",
            }
            ext = file_path.split(".")[-1] if "." in file_path else "text"

            return {
                "path": file_path,
                "content": stdout,
                "language": ext_to_lang.get(ext, "text"),
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{job_id}/download")
async def download_job(job_id: str):
    """Download job as zip file."""
    if job_id not in JOBS:
        raise HTTPException(status_code=404, detail="Job not found")

    workspace = f"{settings.PROJECTS_BASE_PATH}/{job_id}"

    try:
        async with SSHService(
            host=settings.BUILD_SERVER_HOST,
            username=settings.BUILD_SERVER_USER,
            port=settings.BUILD_SERVER_PORT,
        ) as ssh:
            # Create zip on remote
            zip_path = f"/tmp/{job_id}.zip"
            await ssh.run(
                f"cd {workspace} && zip -r {zip_path} . "
                f"-x 'node_modules/*' -x '.git/*' -x '__pycache__/*' -x '.venv/*'",
                timeout=60,
            )

            # Read zip content as base64
            stdout, _, code = await ssh.run(f"base64 {zip_path}", timeout=30)

            if code != 0:
                raise HTTPException(status_code=500, detail="Failed to create zip")

            zip_bytes = base64.b64decode(stdout.strip())

            # Clean up temp file
            await ssh.run(f"rm -f {zip_path}")

            return Response(
                content=zip_bytes,
                media_type="application/zip",
                headers={"Content-Disposition": f"attachment; filename={job_id}.zip"},
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# Preview Endpoints
# =============================================================================


@router.post("/{job_id}/preview/start")
async def start_preview(job_id: str):
    """Start the app for preview."""
    logger.info(f"Starting preview for job {job_id}")

    if job_id not in JOBS:
        raise HTTPException(status_code=404, detail="Job not found")

    workspace = f"{settings.PROJECTS_BASE_PATH}/{job_id}"

    try:
        async with SSHService(
            host=settings.BUILD_SERVER_HOST,
            username=settings.BUILD_SERVER_USER,
            port=settings.BUILD_SERVER_PORT,
        ) as ssh:
            logs = []

            # Check what exists first
            ls_result, _, _ = await ssh.run(f"ls -la {workspace}", timeout=10)
            logger.info(f"Workspace contents:\n{ls_result}")

            backend_check, _, _ = await ssh.run(
                f"test -d {workspace}/backend && echo yes || echo no"
            )
            frontend_check, _, _ = await ssh.run(
                f"test -d {workspace}/frontend && echo yes || echo no"
            )

            backend_exists = backend_check.strip() == "yes"
            frontend_exists = frontend_check.strip() == "yes"

            logger.info(f"Backend exists: {backend_exists}, Frontend exists: {frontend_exists}")

            if not backend_exists and not frontend_exists:
                return {"status": "error", "detail": "No backend or frontend found in workspace", "urls": {}}

            # Use hash to get consistent ports per job
            backend_port = 8100 + abs(hash(job_id)) % 900
            frontend_port = 3100 + abs(hash(job_id)) % 900

            # Kill any existing processes on these ports
            logger.info(f"Killing existing processes on ports {backend_port} and {frontend_port}")
            await ssh.run(f"fuser -k {backend_port}/tcp 2>/dev/null || true", timeout=5)
            await ssh.run(f"fuser -k {frontend_port}/tcp 2>/dev/null || true", timeout=5)
            await asyncio.sleep(1)

            ports = {}
            urls = {}

            if backend_exists:
                ports["backend"] = backend_port

                # Check for requirements.txt
                req_check, _, _ = await ssh.run(f"test -f {workspace}/backend/requirements.txt && echo yes || echo no")
                if req_check.strip() == "yes":
                    logs.append("Installing backend dependencies...")
                    logger.info("Installing backend requirements...")
                    pip_out, pip_err, pip_code = await ssh.run(
                        f"cd {workspace}/backend && pip install -r requirements.txt 2>&1",
                        timeout=120,
                    )
                    if pip_code != 0:
                        logger.warning(f"pip install had issues: {pip_err}")

                # Start backend in background with proper nohup
                logs.append(f"Starting backend on port {backend_port}...")
                logger.info(f"Starting uvicorn on port {backend_port}")

                # Use a more robust command that ensures the process survives
                start_cmd = (
                    f"cd {workspace}/backend && "
                    f"nohup python -m uvicorn app.main:app --host 0.0.0.0 --port {backend_port} "
                    f"> /tmp/{job_id}_backend.log 2>&1 & echo $!"
                )
                pid_out, _, _ = await ssh.run(start_cmd, timeout=10)
                backend_pid = pid_out.strip()
                logger.info(f"Backend started with PID: {backend_pid}")

                urls["backend"] = f"http://{settings.BUILD_SERVER_HOST}:{backend_port}"
                urls["api_docs"] = f"http://{settings.BUILD_SERVER_HOST}:{backend_port}/docs"

            if frontend_exists:
                ports["frontend"] = frontend_port

                # Check for package.json
                pkg_check, _, _ = await ssh.run(f"test -f {workspace}/frontend/package.json && echo yes || echo no")
                if pkg_check.strip() == "yes":
                    logs.append("Installing frontend dependencies...")
                    logger.info("Running npm install...")
                    await ssh.run(
                        f"cd {workspace}/frontend && npm install 2>&1",
                        timeout=180,
                    )

                # Build API URL env var
                api_env = ""
                if backend_exists:
                    api_env = f"VITE_API_URL=http://{settings.BUILD_SERVER_HOST}:{backend_port} "

                # Start frontend
                logs.append(f"Starting frontend on port {frontend_port}...")
                logger.info(f"Starting vite dev server on port {frontend_port}")

                start_cmd = (
                    f"cd {workspace}/frontend && "
                    f"{api_env}nohup npm run dev -- --host 0.0.0.0 --port {frontend_port} "
                    f"> /tmp/{job_id}_frontend.log 2>&1 & echo $!"
                )
                pid_out, _, _ = await ssh.run(start_cmd, timeout=10)
                frontend_pid = pid_out.strip()
                logger.info(f"Frontend started with PID: {frontend_pid}")

                urls["frontend"] = f"http://{settings.BUILD_SERVER_HOST}:{frontend_port}"

            # Give services time to start
            await asyncio.sleep(5)

            # Verify backend is running
            if backend_exists:
                health_out, _, health_code = await ssh.run(
                    f"curl -s -o /dev/null -w '%{{http_code}}' http://localhost:{backend_port}/ || echo 'FAILED'",
                    timeout=10,
                )
                logger.info(f"Backend health check: {health_out.strip()}")
                if health_out.strip() == "FAILED":
                    # Check the log for errors
                    log_out, _, _ = await ssh.run(f"tail -20 /tmp/{job_id}_backend.log", timeout=5)
                    logger.warning(f"Backend might have failed. Log:\n{log_out}")
                    logs.append(f"Warning: Backend may not have started correctly")

            # Store preview info
            PREVIEWS[job_id] = {
                "ports": ports,
                "host": settings.BUILD_SERVER_HOST,
            }

            logger.info(f"Preview started. URLs: {urls}")
            return {"status": "started", "urls": urls, "logs": logs}

    except Exception as e:
        logger.exception("Failed to start preview")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{job_id}/preview/stop")
async def stop_preview(job_id: str):
    """Stop the preview."""
    try:
        async with SSHService(
            host=settings.BUILD_SERVER_HOST,
            username=settings.BUILD_SERVER_USER,
            port=settings.BUILD_SERVER_PORT,
        ) as ssh:
            await ssh.run(f"pkill -f 'uvicorn.*{job_id}' 2>/dev/null || true")
            await ssh.run(f"pkill -f 'vite.*{job_id}' 2>/dev/null || true")
            await ssh.run(f"pkill -f 'npm.*{job_id}' 2>/dev/null || true")

        if job_id in PREVIEWS:
            del PREVIEWS[job_id]

        return {"status": "stopped"}
    except Exception as e:
        logger.error(f"Failed to stop preview: {e}")
        return {"status": "error", "error": str(e)}


@router.get("/{job_id}/preview/status")
async def preview_status(job_id: str):
    """Get preview status."""
    if job_id in PREVIEWS:
        return {"running": True, **PREVIEWS[job_id]}
    return {"running": False}


# =============================================================================
# Iteration / Re-run Endpoints
# =============================================================================


@router.post("/{job_id}/rerun")
async def rerun_agents(job_id: str, agent_ids: List[str], feedback: str = None):
    """Re-run specific agents with optional feedback from review."""
    if job_id not in JOBS:
        raise HTTPException(status_code=404, detail="Job not found")

    job = JOBS[job_id]

    # Reset selected agents to waiting
    for job_agent in job.agents:
        if job_agent.agent_id in agent_ids:
            job_agent.status = "waiting"
            job_agent.progress = 0

    # Update job state
    job.status = JobStatus.running
    job.progress = 0

    # Store feedback for the re-run
    if not hasattr(job, "rerun_feedback"):
        job.rerun_feedback = None
    job.rerun_feedback = feedback

    # Start re-execution in background
    asyncio.create_task(execute_rerun(job_id, agent_ids, feedback))

    await log_activity(job_id, "system", f"Re-running agents: {', '.join(agent_ids)}")

    return {"status": "rerunning", "agents": agent_ids}


async def execute_rerun(job_id: str, agent_ids: List[str], feedback: str = None):
    """Re-execute specific agents with feedback."""
    job = JOBS[job_id]
    workspace = f"{settings.PROJECTS_BASE_PATH}/{job_id}"

    if feedback:
        await log_activity(job_id, "system", f"Feedback: {feedback[:200]}...")

    try:
        async with SSHService(
            host=settings.BUILD_SERVER_HOST,
            username=settings.BUILD_SERVER_USER,
            port=settings.BUILD_SERVER_PORT,
        ) as ssh:
            claude = ClaudeCodeRunner(ssh)

            # Run only selected agents in order
            ordered_agents = [a for a in AGENT_ORDER if a in agent_ids]
            # Add any agents not in predefined order
            for agent_id in agent_ids:
                if agent_id not in ordered_agents:
                    ordered_agents.append(agent_id)

            total_agents = len(ordered_agents)

            for idx, agent_id in enumerate(ordered_agents):
                # Check if job was cancelled
                if JOBS[job_id].status == JobStatus.cancelled:
                    await log_activity(job_id, "system", "Re-run was cancelled")
                    break

                job_agent = next(ja for ja in job.agents if ja.agent_id == agent_id)
                agent = get_agent(agent_id)

                # Update status
                job_agent.status = "working"
                update_agent_status(agent_id, AgentStatus.working, job_id)

                await broadcast_job_update(
                    job_id,
                    {"type": "agent_started", "agent_id": agent_id, "job": job.model_dump()},
                )

                await log_activity(job_id, agent_id, f"{agent.name} starting re-run...")

                # Build prompt with feedback
                base_prompt = get_agent_prompt(agent_id, job.name, job.description)

                if feedback:
                    prompt = f"""{base_prompt}

## IMPORTANT: Previous Review Feedback

The code was reviewed and the following issues were found that you need to fix:

{feedback}

Please fix these issues while maintaining all existing functionality.
Focus on addressing the specific issues mentioned above.
"""
                else:
                    prompt = base_prompt

                # Define output callback
                async def on_output(line: str, aid=agent_id):
                    await log_activity(job_id, aid, line)

                # Run Claude Code
                try:
                    success = await claude.run_agent(
                        workspace=workspace,
                        prompt=prompt,
                        on_output=on_output,
                        timeout=settings.AGENT_TIMEOUT,
                    )
                except Exception as e:
                    logger.exception(f"Agent {agent_id} re-run failed with exception")
                    success = False
                    await log_activity(job_id, agent_id, f"Error: {str(e)}")

                # Update status
                if success:
                    job_agent.status = "done"
                    job_agent.progress = 100
                    update_agent_status(agent_id, AgentStatus.available)
                    await log_activity(job_id, agent_id, f"{agent.name} re-run completed")
                else:
                    job_agent.status = "error"
                    update_agent_status(agent_id, AgentStatus.available)
                    await log_activity(job_id, agent_id, f"{agent.name} re-run failed")
                    job.status = JobStatus.failed
                    break

                # Update progress
                job.progress = int(((idx + 1) / total_agents) * 100)
                await broadcast_job_update(
                    job_id,
                    {"type": "progress", "progress": job.progress, "job": job.model_dump()},
                )

            # Mark complete if not failed
            if job.status != JobStatus.failed:
                job.status = JobStatus.completed
                job.progress = 100

    except Exception as e:
        logger.exception(f"Re-run {job_id} failed with error")
        job.status = JobStatus.failed
        await log_activity(job_id, "system", f"Re-run error: {str(e)}")

        # Release agents
        for job_agent in job.agents:
            if job_agent.agent_id in agent_ids:
                update_agent_status(job_agent.agent_id, AgentStatus.available)

    job.completed_at = datetime.utcnow()
    await broadcast_job_update(job_id, {"type": "completed", "job": job.model_dump()})
    await log_activity(job_id, "system", f"Re-run finished: {job.status.value}")


@router.get("/{job_id}/review")
async def get_review_content(job_id: str):
    """Get the REVIEW.md content for a job (if Sentinel ran)."""
    if job_id not in JOBS:
        raise HTTPException(status_code=404, detail="Job not found")

    workspace = f"{settings.PROJECTS_BASE_PATH}/{job_id}"

    try:
        async with SSHService(
            host=settings.BUILD_SERVER_HOST,
            username=settings.BUILD_SERVER_USER,
            port=settings.BUILD_SERVER_PORT,
        ) as ssh:
            # Try to find REVIEW.md
            stdout, _, code = await ssh.run(
                f"cat {workspace}/REVIEW.md 2>/dev/null || "
                f"cat {workspace}/review.md 2>/dev/null || "
                f"cat {workspace}/CODE_REVIEW.md 2>/dev/null || "
                f"echo ''",
                timeout=10,
            )

            content = stdout.strip()
            if not content:
                return {"found": False, "content": None}

            # Parse issues from the review
            critical_count = content.lower().count("critical")
            warning_count = content.lower().count("warning")
            suggestion_count = content.lower().count("suggestion") + content.lower().count("consider")

            return {
                "found": True,
                "content": content,
                "summary": {
                    "critical": critical_count,
                    "warnings": warning_count,
                    "suggestions": suggestion_count,
                },
            }
    except Exception as e:
        logger.error(f"Error getting review: {e}")
        return {"found": False, "error": str(e)}
