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
