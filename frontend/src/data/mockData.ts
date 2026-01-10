import type { Node, Task, TaskTemplate, Notification } from '../types'

export const mockNodes: Node[] = [
  {
    id: 'proxmox-0',
    name: 'proxmox-0',
    type: 'proxmox',
    cpu_percent: 78,
    ram_used_gb: 16.9,
    ram_total_gb: 31.1,
    disk_used_tb: 2.66,
    disk_total_tb: 297.63,
    status: 'busy',
    position: { x: 50, y: 50 }, // center hub
    k3s_nodes: ['k3s-cp-1-control'],
    active_pods: 3,
  },
  {
    id: 'proxmox-1',
    name: 'proxmox-1',
    type: 'proxmox',
    cpu_percent: 45,
    ram_used_gb: 12.0,
    ram_total_gb: 32.0,
    disk_used_tb: 1.2,
    disk_total_tb: 200.0,
    status: 'idle',
    position: { x: 50, y: 15 }, // top
    k3s_nodes: ['k3s-cp-2'],
    active_pods: 1,
  },
  {
    id: 'proxmox-2',
    name: 'proxmox-2',
    type: 'proxmox',
    cpu_percent: 32,
    ram_used_gb: 8.5,
    ram_total_gb: 16.0,
    disk_used_tb: 0.8,
    disk_total_tb: 100.0,
    status: 'idle',
    position: { x: 85, y: 50 }, // right
    k3s_nodes: ['k3s-cp-3'],
    active_pods: 2,
  },
  {
    id: 'proxmox-3',
    name: 'proxmox-3',
    type: 'proxmox',
    cpu_percent: 91,
    ram_used_gb: 14.8,
    ram_total_gb: 16.0,
    disk_used_tb: 0.5,
    disk_total_tb: 100.0,
    status: 'error', // One node in error state for testing
    position: { x: 15, y: 50 }, // left
    k3s_nodes: [],
    active_pods: 0,
  },
]

export const mockTasks: Task[] = [
  {
    id: 'task_001',
    type: 'automation',
    status: 'running',
    target: 'ServiceDesk Sync',
    description: 'Syncing ServiceDesk Plus tickets',
    started_at: new Date(Date.now() - 120000).toISOString(),
    progress: 45,
    proxmox_node: 'proxmox-1',
    k3s_node: 'k3s-cp-2',
    logs: [
      '[14:20:15] Starting ServiceDesk sync...',
      '[14:20:17] Connected to ServiceDesk Plus API',
      '[14:20:19] Fetching open tickets...',
      '[14:20:21] Processing 127 tickets...',
    ],
  },
  {
    id: 'task_002',
    type: 'analysis',
    status: 'complete',
    target: 'Log Analysis',
    description: 'Analyzed Prometheus logs for anomalies',
    started_at: new Date(Date.now() - 300000).toISOString(),
    completed_at: new Date(Date.now() - 60000).toISOString(),
    progress: 100,
    proxmox_node: 'proxmox-0',
    k3s_node: 'k3s-cp-1-control',
    logs: [
      '[14:15:00] Starting log analysis...',
      '[14:15:05] Parsed 15,234 log entries',
      '[14:15:10] Found 3 anomalies',
      '[14:15:12] Analysis complete',
    ],
  },
]

export const mockTemplates: TaskTemplate[] = [
  {
    id: 'fix-bugs',
    name: 'Fix Bugs',
    icon: '🔧',
    description: 'Analyze and fix bugs in repository',
    promptTemplate: 'SSH into {node} and analyze bugs in {repo}. Fix any issues found.',
  },
  {
    id: 'write-docs',
    name: 'Write Documentation',
    icon: '📝',
    description: 'Generate documentation for code',
    promptTemplate: 'SSH into {node} and generate documentation for {repo}.',
  },
  {
    id: 'deploy-update',
    name: 'Deploy Update',
    icon: '🚀',
    description: 'Deploy latest changes to production',
    promptTemplate: 'SSH into {node} and deploy latest changes from {repo} to production.',
  },
  {
    id: 'security-scan',
    name: 'Security Scan',
    icon: '🛡️',
    description: 'Run security vulnerability scan',
    promptTemplate: 'SSH into {node} and run security scan on {repo}.',
  },
]

export const mockNotifications: Notification[] = [
  {
    id: 'notif_001',
    type: 'warning',
    message: 'proxmox-3: High CPU usage detected (91%)',
    timestamp: new Date(Date.now() - 300000).toISOString(),
    read: false,
  },
  {
    id: 'notif_002',
    type: 'success',
    message: 'Log analysis completed successfully',
    timestamp: new Date(Date.now() - 60000).toISOString(),
    read: false,
  },
  {
    id: 'notif_003',
    type: 'info',
    message: 'K3s cluster health check passed',
    timestamp: new Date(Date.now() - 600000).toISOString(),
    read: true,
  },
]

// Pool of mock log messages for streaming simulation
export const mockLogMessages: string[] = [
  'Connecting to remote host...',
  'Authentication successful',
  'Fetching repository state...',
  'Analyzing file changes...',
  'Running static analysis...',
  'Checking dependencies...',
  'Executing task pipeline...',
  'Processing results...',
  'Generating report...',
  'Uploading artifacts...',
  'Cleaning up temporary files...',
  'Validating output...',
  'Task checkpoint saved',
  'Memory usage: nominal',
  'CPU throttling: none',
]
