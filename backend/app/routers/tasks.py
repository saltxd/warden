"""Tasks router for executing and managing tasks."""
import asyncio
from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import Dict, List, Optional
from datetime import datetime
from pydantic import BaseModel
from ..models import Task, TaskStatus, TaskCreate
from ..services.ssh import ssh_executor


router = APIRouter(prefix="/tasks", tags=["tasks"])

# In-memory task storage (would use Redis/DB in production)
tasks_store: Dict[str, Task] = {}


class TaskResponse(BaseModel):
    """Response when creating a task."""
    id: str
    status: TaskStatus
    message: str


def generate_task_id() -> str:
    """Generate a unique task ID."""
    return f"task_{int(datetime.now().timestamp() * 1000)}"


async def execute_task_background(task_id: str, task_type: str, node_id: str, prompt: str):
    """Execute task in background and update task store."""
    task = tasks_store.get(task_id)
    if not task:
        return

    async def update_log(log_line: str):
        """Callback to add log lines to task."""
        if task_id in tasks_store:
            tasks_store[task_id].logs.append(log_line)

    try:
        # Update task status
        tasks_store[task_id].status = TaskStatus.running
        await update_log(f"[{datetime.now().strftime('%H:%M:%S')}] Task started")

        # Determine what command to run based on task type and prompt
        prompt_lower = prompt.lower()

        if "service" in prompt_lower or "check" in prompt_lower:
            # Check services
            success, _ = await ssh_executor.check_services(node_id, update_log)
        elif "resource" in prompt_lower or "usage" in prompt_lower or "memory" in prompt_lower or "cpu" in prompt_lower:
            # Check resources
            success, _ = await ssh_executor.check_resources(node_id, update_log)
        elif "docker" in prompt_lower:
            # Docker-specific
            success, _ = await ssh_executor.execute_command(
                node_id,
                "docker ps -a --format 'table {{.Names}}\t{{.Status}}\t{{.Image}}'",
                update_log,
            )
        elif "pod" in prompt_lower or "kubernetes" in prompt_lower or "k8s" in prompt_lower:
            # Kubernetes-specific
            success, _ = await ssh_executor.execute_command(
                node_id,
                "kubectl get pods -A -o wide",
                update_log,
            )
        elif "log" in prompt_lower:
            # Check system logs
            success, _ = await ssh_executor.execute_command(
                node_id,
                "journalctl -n 30 --no-pager",
                update_log,
            )
        elif "disk" in prompt_lower or "storage" in prompt_lower:
            # Disk usage
            success, _ = await ssh_executor.execute_command(
                node_id,
                "df -h && echo '' && lsblk",
                update_log,
            )
        elif "network" in prompt_lower or "connection" in prompt_lower:
            # Network info
            success, _ = await ssh_executor.execute_command(
                node_id,
                "ip addr && echo '' && ss -tuln | head -20",
                update_log,
            )
        elif "uptime" in prompt_lower or "load" in prompt_lower:
            # System uptime and load
            success, _ = await ssh_executor.execute_command(
                node_id,
                "uptime && echo '' && cat /proc/loadavg",
                update_log,
            )
        else:
            # Default: run a comprehensive check
            await update_log(f"[{datetime.now().strftime('%H:%M:%S')}] Running comprehensive system check...")
            success, _ = await ssh_executor.execute_command(
                node_id,
                "echo '=== UPTIME ===' && uptime && echo '' && echo '=== MEMORY ===' && free -h && echo '' && echo '=== DISK ===' && df -h / && echo '' && echo '=== TOP PROCESSES ===' && ps aux --sort=-%mem | head -6",
                update_log,
            )

        # Update final status
        if success:
            tasks_store[task_id].status = TaskStatus.complete
            tasks_store[task_id].progress = 100
            await update_log(f"[{datetime.now().strftime('%H:%M:%S')}] Task completed successfully")
        else:
            tasks_store[task_id].status = TaskStatus.failed
            await update_log(f"[{datetime.now().strftime('%H:%M:%S')}] Task failed")

        tasks_store[task_id].completed_at = datetime.now()

    except Exception as e:
        tasks_store[task_id].status = TaskStatus.failed
        tasks_store[task_id].logs.append(f"[{datetime.now().strftime('%H:%M:%S')}] Error: {str(e)}")
        tasks_store[task_id].completed_at = datetime.now()


@router.post("", response_model=TaskResponse)
async def create_task(task_data: TaskCreate, background_tasks: BackgroundTasks):
    """Create and execute a new task."""
    task_id = generate_task_id()

    # Determine target node - use k3s_node if provided, otherwise proxmox_node
    target_node = task_data.k3s_node or task_data.proxmox_node

    task = Task(
        id=task_id,
        type=task_data.type,
        status=TaskStatus.queued,
        target=task_data.target,
        description=task_data.description,
        started_at=datetime.now(),
        progress=0,
        proxmox_node=task_data.proxmox_node,
        k3s_node=task_data.k3s_node,
        logs=[f"[{datetime.now().strftime('%H:%M:%S')}] Task queued"],
    )

    tasks_store[task_id] = task

    # Execute in background
    background_tasks.add_task(
        execute_task_background,
        task_id,
        task_data.type,
        target_node,
        task_data.description,
    )

    return TaskResponse(
        id=task_id,
        status=TaskStatus.queued,
        message=f"Task created and queued for execution on {target_node}",
    )


@router.get("", response_model=List[Task])
async def list_tasks():
    """List all tasks."""
    return list(tasks_store.values())


@router.get("/{task_id}", response_model=Task)
async def get_task(task_id: str):
    """Get a specific task by ID."""
    if task_id not in tasks_store:
        raise HTTPException(status_code=404, detail="Task not found")
    return tasks_store[task_id]


@router.get("/{task_id}/logs", response_model=List[str])
async def get_task_logs(task_id: str, since: int = 0):
    """
    Get task logs, optionally since a specific index.

    Args:
        task_id: The task ID
        since: Return logs starting from this index (for polling new logs)
    """
    if task_id not in tasks_store:
        raise HTTPException(status_code=404, detail="Task not found")

    task = tasks_store[task_id]
    return task.logs[since:]


@router.delete("/{task_id}")
async def delete_task(task_id: str):
    """Delete a task from the store."""
    if task_id not in tasks_store:
        raise HTTPException(status_code=404, detail="Task not found")

    del tasks_store[task_id]
    return {"message": "Task deleted"}
