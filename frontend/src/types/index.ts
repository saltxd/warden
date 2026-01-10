export type NodeStatus = 'idle' | 'busy' | 'error' | 'offline'
export type TaskStatus = 'running' | 'complete' | 'failed' | 'queued'
export type ModalType = 'deploy' | 'automation' | 'analysis' | null

export interface NodePosition {
  x: number  // percentage of container width (0-100)
  y: number  // percentage of container height (0-100)
}

export interface Node {
  id: string
  name: string
  type: 'proxmox'
  cpu_percent: number
  ram_used_gb: number
  ram_total_gb: number
  disk_used_tb: number
  disk_total_tb: number
  status: NodeStatus
  position: NodePosition
  k3s_nodes: string[]
  active_pods: number
}

export interface Task {
  id: string
  type: 'claude-code' | 'automation' | 'analysis'
  status: TaskStatus
  target: string
  description: string
  started_at: string
  completed_at?: string
  progress: number
  proxmox_node: string
  k3s_node?: string
  pod_name?: string
  logs: string[]
}

export interface TaskTemplate {
  id: string
  name: string
  icon: string
  description: string
  promptTemplate: string
}

export interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  message: string
  timestamp: string
  read: boolean
}

// ============================================
// Multi-Agent System Types
// ============================================

export type AgentStatus = 'available' | 'working' | 'offline'
export type AgentSpec = 'frontend' | 'backend' | 'devops' | 'reviewer' | 'fullstack'
export type JobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'

export interface Agent {
  id: string
  name: string
  spec: AgentSpec
  description: string
  skills: string[]
  color: string
  vm_host: string
  ssh_user: string
  working_directory: string
  status: AgentStatus
  current_job_id: string | null
  jobs_completed: number
  success_rate: number
}

export interface JobAgent {
  agent_id: string
  status: 'waiting' | 'working' | 'done' | 'error'
  progress: number
  current_task: string | null
}

export interface ActivityLogEntry {
  timestamp: string
  agent_id: string
  message: string
}

export interface Job {
  id: string
  name: string
  description: string
  agents: JobAgent[]
  status: JobStatus
  created_at: string
  started_at: string | null
  completed_at: string | null
  progress: number
  repository: string | null
  activity_log: ActivityLogEntry[]
  artifacts: string[]
}

export interface JobCreate {
  name: string
  description: string
  agent_ids: string[]
  repository?: string
}
