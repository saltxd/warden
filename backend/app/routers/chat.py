from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Optional
import asyncio
import uuid
import logging
import re
from datetime import datetime
import time

from ..services.ssh_service import SSHService
from ..services.claude_runner import ClaudeCodeRunner
from ..services.background_jobs import (
    BackgroundJob,
    JobStatus,
    is_long_operation,
    create_job,
    get_job,
    list_jobs,
    run_background_job,
)
from ..services.discord_notify import notify_job_started, notify_job_completed
from ..config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chat", tags=["chat"])


def get_local_timestamp() -> str:
    """Get current local time as ISO string."""
    return datetime.now().astimezone().isoformat()


def clean_terminal_output(text: str) -> str:
    """Remove terminal escape codes from output."""
    if not text:
        return text
    # Remove ANSI escape sequences
    ansi_escape = re.compile(r'\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])')
    text = ansi_escape.sub('', text)
    # Remove terminal mode codes
    text = re.sub(r'\[\?[0-9]+[lh]', '', text)
    text = re.sub(r'\[<u', '', text)
    text = re.sub(r'\[\d*[ABCDEFGJKST]', '', text)
    # Remove carriage returns and other control chars
    text = text.replace('\r', '')
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', text)
    return text.strip()


# Store conversation history per session
CONVERSATIONS: dict[str, list[dict]] = {}

# Active WebSocket connections
CONNECTIONS: dict[str, WebSocket] = {}


def format_job_list() -> str:
    """Format the job list for display."""
    jobs = list_jobs(10)
    if not jobs:
        return "No background jobs found."

    lines = ["BACKGROUND JOBS", "=" * 50]
    for job in jobs:
        status_icon = {
            JobStatus.PENDING: "[..]",
            JobStatus.RUNNING: "[>>]",
            JobStatus.COMPLETED: "[OK]",
            JobStatus.FAILED: "[!!]",
        }.get(job.status, "[??]")

        duration = ""
        if job.completed_at and job.started_at:
            secs = (job.completed_at - job.started_at).seconds
            duration = f" ({secs}s)"

        lines.append(f"{status_icon} {job.id}: {job.task[:40]}...{duration}")

    return "\n".join(lines)


def format_job_detail(job_id: str) -> str:
    """Format job detail for display."""
    job = get_job(job_id)
    if not job:
        return f"Job '{job_id}' not found."

    lines = [
        f"JOB: {job.id}",
        "=" * 50,
        f"Task: {job.task}",
        f"Status: {job.status.value}",
        f"Created: {job.created_at.strftime('%Y-%m-%d %H:%M:%S')}",
    ]

    if job.started_at:
        lines.append(f"Started: {job.started_at.strftime('%Y-%m-%d %H:%M:%S')}")
    if job.completed_at:
        lines.append(f"Completed: {job.completed_at.strftime('%Y-%m-%d %H:%M:%S')}")
        if job.started_at:
            duration = (job.completed_at - job.started_at).seconds
            lines.append(f"Duration: {duration}s")

    if job.error:
        lines.append(f"Error: {job.error}")

    if job.output_lines:
        lines.append("")
        lines.append("LAST OUTPUT:")
        lines.append("-" * 50)
        lines.extend(job.output_lines[-10:])

    return "\n".join(lines)


def format_help() -> str:
    """Format help message."""
    return """WARDEN COMMANDS
===============

/help           - Show this help message
/jobs           - List background jobs
/jobs <id>      - Show details for a specific job
/clear          - Clear conversation history

BACKGROUND JOBS
---------------
Long-running operations (updates, deployments, restarts, etc.)
automatically run in the background. You'll get a Discord
notification when they complete.

CAPABILITIES
------------
- SSH to any homelab node
- Run kubectl commands on K3s cluster
- Check system status, logs, configs
- Create documentation
- Analyze and troubleshoot issues

NODES
-----
- k3s-cp-1, k3s-cp-2, k3s-cp-3 - K3s control plane
- k3s-worker-1 - K3s worker node
- proxmox-0, proxmox-1, proxmox-2, proxmox-3 - Proxmox hosts
- fz-dns, wt-dns - AdGuard DNS servers
"""


def handle_slash_command(message: str) -> Optional[str]:
    """Handle slash commands, return response or None if not a command."""
    message = message.strip()

    if message == "/help":
        return format_help()

    if message == "/jobs":
        return format_job_list()

    if message.startswith("/jobs "):
        job_id = message[6:].strip()
        return format_job_detail(job_id)

    if message == "/clear":
        return "CLEAR_SESSION"  # Special marker

    return None  # Not a slash command


@router.websocket("/ws")
async def chat_websocket(websocket: WebSocket, session_id: Optional[str] = None):
    """WebSocket for real-time chat with Claude Code."""
    await websocket.accept()

    # Create or use session
    if not session_id or session_id not in CONVERSATIONS:
        session_id = f"session_{uuid.uuid4().hex[:8]}"
        CONVERSATIONS[session_id] = []

    CONNECTIONS[session_id] = websocket

    # Send session ID to client
    await websocket.send_json(
        {
            "type": "connected",
            "session_id": session_id,
            "history": CONVERSATIONS[session_id],
        }
    )

    try:
        while True:
            # Receive message from user
            data = await websocket.receive_json()

            if data.get("type") == "message":
                user_message = data.get("content", "")

                # Check for slash commands first
                slash_response = handle_slash_command(user_message)
                if slash_response:
                    if slash_response == "CLEAR_SESSION":
                        CONVERSATIONS[session_id] = []
                        await websocket.send_json({
                            "type": "session_cleared",
                            "timestamp": get_local_timestamp(),
                        })
                    else:
                        await websocket.send_json({
                            "type": "assistant_start",
                            "timestamp": get_local_timestamp(),
                        })
                        for line in slash_response.split("\n"):
                            await websocket.send_json({
                                "type": "assistant_chunk",
                                "content": line,
                                "timestamp": get_local_timestamp(),
                            })
                        await websocket.send_json({
                            "type": "assistant_done",
                            "timestamp": get_local_timestamp(),
                        })
                    continue

                # Add to history
                CONVERSATIONS[session_id].append(
                    {
                        "role": "user",
                        "content": user_message,
                        "timestamp": get_local_timestamp(),
                    }
                )

                # Send acknowledgment
                await websocket.send_json(
                    {
                        "type": "user_message",
                        "content": user_message,
                        "timestamp": get_local_timestamp(),
                    }
                )

                # Check if this is a long-running operation
                if is_long_operation(user_message):
                    await process_background_message(session_id, user_message, websocket)
                else:
                    # Process normally with Claude Code
                    await process_message(session_id, user_message, websocket)

    except WebSocketDisconnect:
        logger.info(f"Session {session_id} disconnected")
        if session_id in CONNECTIONS:
            del CONNECTIONS[session_id]


async def process_message(session_id: str, message: str, websocket: WebSocket):
    """Send message to Claude Code and stream response."""

    # Build context from conversation history
    history = CONVERSATIONS[session_id]
    context = build_context(history)

    # Build the prompt
    prompt = f"""{context}

USER MESSAGE:
{message}

---

You are Warden, an AI assistant with access to a homelab via SSH.

AVAILABLE NODES (SSH from this machine):
- k3s-cp-1 (10.0.1.10) - Fort Zero, K3s control plane
- k3s-cp-2 (10.0.1.11) - Watchtower, K3s control plane
- k3s-cp-3 (10.0.1.13) - Sigil, K3s control plane
- k3s-worker-1 (10.0.1.12) - Watchtower worker node
- fz-dns / wt-dns - AdGuard DNS servers
- Proxmox nodes: proxmox-0 (10.0.0.10), proxmox-1 (10.0.0.11), proxmox-2 (10.0.0.12), proxmox-3 (10.0.0.13)

CAPABILITIES:
- SSH to any node and run commands
- Check system status, logs, configs
- Create documentation
- Analyze and troubleshoot issues
- Run kubectl commands for K3s (kubeconfig at ~/.kube/config)

INSTRUCTIONS:
- Be concise and helpful
- If you need to SSH somewhere, just do it
- If you need clarification, ask
- Show relevant output, summarize if too long
- If you create files, mention where they are
- Format output as PLAIN TEXT only - no markdown
- Use UPPERCASE for emphasis instead of **bold** or *italic*
- Use simple ASCII for tables and structure

Respond to the user's message:
"""

    # Send "thinking" indicator
    await websocket.send_json(
        {"type": "assistant_start", "timestamp": get_local_timestamp()}
    )

    full_response = []

    try:
        # Connect to bastion via SSH
        async with SSHService(
            host=settings.BUILD_SERVER_HOST,
            username=settings.BUILD_SERVER_USER,
            port=settings.BUILD_SERVER_PORT,
        ) as ssh:
            claude = ClaudeCodeRunner(ssh)

            async def on_output(line: str):
                # Clean terminal escape codes
                cleaned = clean_terminal_output(line)
                if cleaned:  # Only send non-empty lines
                    full_response.append(cleaned)
                    await websocket.send_json(
                        {
                            "type": "assistant_chunk",
                            "content": cleaned,
                            "timestamp": get_local_timestamp(),
                        }
                    )

            await claude.run_agent(
                workspace="/home/admin",
                prompt=prompt,
                on_output=on_output,
                timeout=300,  # 5 min timeout for chat
            )

    except Exception as e:
        logger.exception("Error processing message")
        await websocket.send_json(
            {
                "type": "error",
                "content": f"Error: {str(e)}",
                "timestamp": get_local_timestamp(),
            }
        )
        return

    # Combine response and save to history
    assistant_message = "\n".join(full_response)
    CONVERSATIONS[session_id].append(
        {
            "role": "assistant",
            "content": assistant_message,
            "timestamp": get_local_timestamp(),
        }
    )

    # Send completion
    await websocket.send_json(
        {"type": "assistant_done", "timestamp": get_local_timestamp()}
    )


async def process_background_message(session_id: str, message: str, websocket: WebSocket):
    """Start a background job for long-running operations."""

    # Create background job
    job = create_job(message[:100])

    # Immediately respond to user
    await websocket.send_json(
        {"type": "assistant_start", "timestamp": get_local_timestamp()}
    )

    response_lines = [
        f"This looks like a long-running operation.",
        f"Starting background job: {job.id}",
        "",
        "I'll notify you in Discord when it's complete.",
        "",
        f"Use /jobs {job.id} to check status.",
    ]

    for line in response_lines:
        await websocket.send_json(
            {
                "type": "assistant_chunk",
                "content": line,
                "timestamp": get_local_timestamp(),
            }
        )

    await websocket.send_json(
        {"type": "assistant_done", "timestamp": get_local_timestamp()}
    )

    # Save to history
    CONVERSATIONS[session_id].append(
        {
            "role": "assistant",
            "content": "\n".join(response_lines),
            "timestamp": get_local_timestamp(),
        }
    )

    # Notify Discord that job started
    await notify_job_started(job.id, message[:100])

    # Build the prompt
    history = CONVERSATIONS[session_id]
    context = build_context(history[:-1])  # Exclude the "starting job" response

    prompt = f"""{context}

USER MESSAGE:
{message}

---

You are Warden, an AI assistant with access to a homelab via SSH.

AVAILABLE NODES (SSH from this machine):
- k3s-cp-1 (10.0.1.10) - Fort Zero, K3s control plane
- k3s-cp-2 (10.0.1.11) - Watchtower, K3s control plane
- k3s-cp-3 (10.0.1.13) - Sigil, K3s control plane
- k3s-worker-1 (10.0.1.12) - Watchtower worker node
- fz-dns / wt-dns - AdGuard DNS servers
- Proxmox nodes: proxmox-0 (10.0.0.10), proxmox-1 (10.0.0.11), proxmox-2 (10.0.0.12), proxmox-3 (10.0.0.13)

CAPABILITIES:
- SSH to any node and run commands
- Check system status, logs, configs
- Create documentation
- Analyze and troubleshoot issues
- Run kubectl commands for K3s (kubeconfig at ~/.kube/config)

INSTRUCTIONS:
- Be concise and helpful
- If you need to SSH somewhere, just do it
- Show relevant output, summarize if too long
- Format output as PLAIN TEXT only - no markdown

Complete the user's request:
"""

    # Define the run function for the background job
    async def run_claude(on_output):
        start_time = time.time()
        try:
            async with SSHService(
                host=settings.BUILD_SERVER_HOST,
                username=settings.BUILD_SERVER_USER,
                port=settings.BUILD_SERVER_PORT,
            ) as ssh:
                claude = ClaudeCodeRunner(ssh)

                async def wrapped_output(line: str):
                    cleaned = clean_terminal_output(line)
                    if cleaned:
                        await on_output(cleaned)

                return await claude.run_agent(
                    workspace="/home/admin",
                    prompt=prompt,
                    on_output=wrapped_output,
                    timeout=600,  # 10 min for background jobs
                )
        except Exception as e:
            logger.exception(f"Background job {job.id} failed")
            await on_output(f"Error: {str(e)}")
            return False

    # Define completion callback
    async def on_complete(completed_job: BackgroundJob):
        duration = 0
        if completed_job.started_at and completed_job.completed_at:
            duration = int((completed_job.completed_at - completed_job.started_at).total_seconds())

        # Get a summary from the output
        summary = None
        if completed_job.output_lines:
            # Take last few meaningful lines as summary
            summary = "\n".join(completed_job.output_lines[-5:])

        await notify_job_completed(
            job_id=completed_job.id,
            task=completed_job.task,
            duration_seconds=duration,
            success=(completed_job.status == JobStatus.COMPLETED),
            summary=summary,
        )

    # Start the background job
    asyncio.create_task(run_background_job(job, run_claude, on_complete))


def build_context(history: list[dict]) -> str:
    """Build conversation context from history."""
    if not history:
        return "No previous conversation."

    # Take last 10 messages for context
    recent = history[-10:]

    lines = ["CONVERSATION HISTORY:"]
    for msg in recent:
        role = "User" if msg["role"] == "user" else "Warden"
        content = msg["content"]
        # Truncate long messages in context
        if len(content) > 500:
            content = content[:500] + "..."
        lines.append(f"{role}: {content}")

    return "\n".join(lines)


@router.get("/sessions")
async def list_sessions():
    """List active chat sessions."""
    return {
        "sessions": [
            {
                "id": sid,
                "messages": len(msgs),
                "last_active": msgs[-1]["timestamp"] if msgs else None,
            }
            for sid, msgs in CONVERSATIONS.items()
        ]
    }


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    """Delete a chat session."""
    if session_id in CONVERSATIONS:
        del CONVERSATIONS[session_id]
    return {"status": "deleted"}


@router.get("/sessions/{session_id}")
async def get_session(session_id: str):
    """Get a specific chat session's history."""
    if session_id not in CONVERSATIONS:
        return {"error": "Session not found", "history": []}
    return {"session_id": session_id, "history": CONVERSATIONS[session_id]}
