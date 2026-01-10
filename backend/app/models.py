from pydantic import BaseModel
from typing import Optional, List
from enum import Enum
from datetime import datetime


class NodeStatus(str, Enum):
    idle = "idle"
    busy = "busy"
    error = "error"
    offline = "offline"


class TaskStatus(str, Enum):
    queued = "queued"
    running = "running"
    complete = "complete"
    failed = "failed"


class NodePosition(BaseModel):
    x: float  # percentage 0-100
    y: float


class Node(BaseModel):
    id: str
    name: str
    type: str = "proxmox"
    cpu_percent: float
    ram_used_gb: float
    ram_total_gb: float
    disk_used_tb: float
    disk_total_tb: float
    status: NodeStatus
    position: NodePosition
    k3s_nodes: List[str] = []
    active_pods: int = 0
    uptime: Optional[int] = None  # seconds


class K3sNode(BaseModel):
    name: str
    status: str
    roles: List[str]
    cpu_percent: float
    ram_percent: float
    pods: int
    proxmox_host: str  # Which Proxmox node it runs on


class Task(BaseModel):
    id: str
    type: str
    status: TaskStatus
    target: str
    description: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    progress: int = 0
    proxmox_node: str
    k3s_node: Optional[str] = None
    pod_name: Optional[str] = None
    logs: List[str] = []


class TaskCreate(BaseModel):
    type: str
    target: str
    description: str
    proxmox_node: str
    k3s_node: Optional[str] = None


class ClusterMetrics(BaseModel):
    total_cpu_percent: float
    total_ram_used_gb: float
    total_ram_total_gb: float
    total_disk_used_tb: float
    total_disk_total_tb: float
    nodes_online: int
    nodes_total: int
    running_tasks: int


# ============================================
# Multi-Agent System Models
# ============================================

class AgentStatus(str, Enum):
    available = "available"
    working = "working"
    offline = "offline"


class AgentSpec(str, Enum):
    frontend = "frontend"
    backend = "backend"
    devops = "devops"
    reviewer = "reviewer"
    fullstack = "fullstack"


class Agent(BaseModel):
    id: str
    name: str
    spec: AgentSpec
    description: str
    skills: List[str]
    color: str  # Hex color for avatar gradient
    vm_host: str  # Which VM/node to run on
    ssh_user: str
    working_directory: str
    status: AgentStatus = AgentStatus.available
    current_job_id: Optional[str] = None
    jobs_completed: int = 0
    success_rate: float = 100.0


class JobStatus(str, Enum):
    queued = "queued"
    running = "running"
    completed = "completed"
    failed = "failed"
    cancelled = "cancelled"


class JobAgent(BaseModel):
    agent_id: str
    status: str  # "waiting" | "working" | "done" | "error"
    progress: int
    current_task: Optional[str] = None


class Job(BaseModel):
    id: str
    name: str
    description: str
    agents: List[JobAgent]
    status: JobStatus
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    progress: int = 0
    repository: Optional[str] = None
    activity_log: List[dict] = []  # {"timestamp", "agent_id", "message"}
    artifacts: List[str] = []  # Files created


class JobCreate(BaseModel):
    name: str
    description: str
    agent_ids: List[str]
    repository: Optional[str] = None
