# Warden

> Homelab Command Interface - SSH access to K3s cluster and Proxmox nodes via Claude Code

## Overview

Warden is a terminal-style chat interface for managing homelab infrastructure. It connects to Claude Code running on a bastion host (bastion) which has SSH access to all nodes.

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│ Browser (warden.cluster.local)                                 │
│    │                                                     │
│    ▼                                                     │
│ bastion (10.0.2.10)                                 │
│ ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│ │  Frontend   │──│   Backend   │──│ Claude Code │       │
│ │  (React)    │  │  (FastAPI)  │  │             │       │
│ └─────────────┘  └─────────────┘  └──────┬──────┘       │
│                                          │ SSH          │
└──────────────────────────────────────────┼──────────────┘
                                           │
              ┌────────────────────────────┼────────────────┐
              ▼              ▼             ▼                ▼
           k3s-cp-1        k3s-cp-2    k3s-cp-3   k3s-worker-1
           (.190)        (.191)       (.193)          (.192)
```

## Features

- Terminal aesthetic matching Citadel Situation Monitor
- Natural language commands to Claude Code
- SSH access to entire homelab
- Real-time streaming responses via WebSocket
- Quick action buttons for common tasks
- Node status monitoring
- Command history with arrow keys
- Slash commands (/clear, /export, /help)

## Quick Start

### Development

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev
```

### Production (Docker)

```bash
docker-compose up -d --build
```

Access at `http://localhost:3000` or `warden.cluster.local`

## Configuration

Environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `BUILD_SERVER_HOST` | SSH host for Claude Code | `10.0.2.10` |
| `BUILD_SERVER_USER` | SSH user | `admin` |
| `CLAUDE_CODE_PATH` | Path to Claude Code binary | `/home/admin/.claude/local/claude` |

## Nodes

| Node | IP | Role |
|------|-----|------|
| bastion | 10.0.2.10 | Bastion / Claude Code host |
| k3s-cp-1 | 10.0.1.10 | K3s Control Plane |
| k3s-cp-2 | 10.0.1.11 | K3s Control Plane |
| k3s-cp-3 | 10.0.1.13 | K3s Control Plane |
| k3s-worker-1 | 10.0.1.12 | K3s Worker |

## Example Queries

- "Check K3s cluster status"
- "Show disk usage on all nodes"
- "List pods in kube-system namespace"
- "What's running on proxmox-1?"
- "Check logs for grafana pod"

## Tech Stack

- **Frontend**: React, TypeScript, Vite
- **Backend**: Python, FastAPI, WebSockets
- **AI**: Claude Code (Anthropic)
- **Deployment**: Docker, Docker Compose

## Part of Citadel

Warden is part of the Citadel homelab ecosystem:

- **Citadel** - Overall infrastructure
- **Situation Monitor** - Real-time dashboard (monitor.cluster.local)
- **Warden** - AI command interface (warden.cluster.local)

## License

MIT
