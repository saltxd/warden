# Warden

> Homelab Command Interface - AI-powered SSH access to K3s cluster and Proxmox nodes

## Overview

Warden is a terminal-style chat interface for managing homelab infrastructure. It runs in K3s and connects via SSH to a bastion host (bastion) where Claude Code executes commands across all nodes.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  K3s Cluster                                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  warden namespace                                        │   │
│  │  ┌─────────────┐     ┌─────────────┐                    │   │
│  │  │  Frontend   │     │   Backend   │──────SSH──────┐    │   │
│  │  │  (React)    │     │  (FastAPI)  │               │    │   │
│  │  └─────────────┘     └─────────────┘               │    │   │
│  └─────────────────────────────────────────────────────│────┘   │
│                                                        │        │
│  Traefik IngressRoute: warden.cluster.local                 │        │
└────────────────────────────────────────────────────────│────────┘
                                                         │
                                                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  bastion (10.0.2.10)                                       │
│  ┌─────────────┐                                                │
│  │ Claude Code │───SSH───┬──────┬──────┬──────┬──────┐         │
│  └─────────────┘         │      │      │      │      │         │
└──────────────────────────│──────│──────│──────│──────│─────────┘
                           ▼      ▼      ▼      ▼      ▼
                        k3s-cp-1 k3s-cp-2 k3s-cp-3  k3s-cp-2  Proxmox
                        (.190) (.191) (.193)  worker  hosts
```

## Features

- **Terminal UI** - Green-on-black aesthetic matching Citadel Situation Monitor
- **Natural Language** - Ask Claude Code anything about your infrastructure
- **SSH Access** - Full access to K3s nodes, Proxmox hosts, and services
- **Background Jobs** - Long operations run async with Discord notifications
- **Real-time Streaming** - WebSocket-based response streaming
- **Slash Commands** - `/help`, `/jobs`, `/jobs <id>`, `/clear`
- **Mobile Friendly** - PWA with proper viewport handling

## Slash Commands

| Command | Description |
|---------|-------------|
| `/help` | Show available commands and capabilities |
| `/jobs` | List recent background jobs |
| `/jobs <id>` | Show details for a specific job |
| `/clear` | Clear conversation history |

## Background Jobs

Long-running operations are automatically detected and run in the background:
- System updates (`apt upgrade`, `yum update`)
- Service restarts
- Deployments (`kubectl apply`, `helm install`)
- Docker operations (`docker-compose up`, `docker build`)

When a background job starts:
1. Warden responds immediately with job ID
2. Discord notification shows "Job Running"
3. On completion, Discord message updates to "Job Completed" or "Job Failed"

## Deployment

### Prerequisites

- K3s cluster with Traefik ingress
- SSH key with access to bastion
- GitHub Container Registry access (ghcr.io)

### Quick Deploy

```bash
# Create namespace and secrets
kubectl create namespace warden

kubectl -n warden create secret docker-registry ghcr-secret \
  --docker-server=ghcr.io \
  --docker-username=YOUR_USERNAME \
  --docker-password=YOUR_PAT

kubectl -n warden create secret generic ssh-key \
  --from-file=id_ed25519=~/.ssh/id_ed25519 \
  --from-file=known_hosts=<(ssh-keyscan 10.0.2.10)

# Deploy
kubectl apply -f k8s/
```

### Build Images

```bash
# Build for amd64 (K3s nodes)
docker buildx build --platform linux/amd64 \
  -t ghcr.io/saltxd/warden-frontend:latest --push ./frontend

docker buildx build --platform linux/amd64 \
  -t ghcr.io/saltxd/warden-backend:latest --push ./backend
```

### Local Development

```bash
# Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev
```

## Configuration

### Environment Variables (Backend)

| Variable | Description | Default |
|----------|-------------|---------|
| `BUILD_SERVER_HOST` | SSH host for Claude Code | `10.0.2.10` |
| `BUILD_SERVER_USER` | SSH user | `admin` |
| `BUILD_SERVER_PORT` | SSH port | `22` |
| `TZ` | Timezone | `America/Denver` |

### Discord Webhook

Discord notifications are configured in `backend/app/services/discord_notify.py`. Update `DISCORD_WEBHOOK_URL` for your channel.

## Nodes

| Node | IP | Role |
|------|-----|------|
| bastion | 10.0.2.10 | Bastion / Claude Code host |
| k3s-cp-1 | 10.0.1.10 | K3s Control Plane |
| k3s-cp-2 | 10.0.1.11 | K3s Control Plane |
| k3s-cp-3 | 10.0.1.13 | K3s Control Plane |
| k3s-worker-1 | 10.0.1.12 | K3s Worker |
| proxmox-0 | 10.0.0.10 | Proxmox Host |
| proxmox-1 | 10.0.0.11 | Proxmox Host |
| proxmox-2 | 10.0.0.12 | Proxmox Host |
| proxmox-3 | 10.0.0.13 | Proxmox Host |

## Example Queries

```
What's the status of the K3s cluster?
Show disk usage on all Proxmox hosts
List all pods in the monitoring namespace
Check memory usage on proxmox-1
Restart the grafana deployment
Show logs for the traefik pod
Update packages on k3s-cp-1
```

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, PWA
- **Backend**: Python 3.11, FastAPI, asyncssh, aiohttp
- **AI**: Claude Code (Anthropic)
- **Infrastructure**: K3s, Traefik, Docker
- **Notifications**: Discord Webhooks

## Project Structure

```
warden/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── Chat.tsx        # Main chat interface
│   │   └── main.tsx
│   ├── Dockerfile
│   └── nginx.conf
├── backend/
│   ├── app/
│   │   ├── routers/
│   │   │   └── chat.py         # WebSocket chat handler
│   │   ├── services/
│   │   │   ├── ssh_service.py      # SSH connection
│   │   │   ├── claude_runner.py    # Claude Code executor
│   │   │   ├── background_jobs.py  # Job tracking
│   │   │   └── discord_notify.py   # Discord webhooks
│   │   └── config.py
│   ├── Dockerfile
│   └── requirements.txt
├── k8s/
│   ├── namespace.yaml
│   ├── deployment.yaml
│   ├── service.yaml
│   └── ingressroute.yaml
└── README.md
```

## Part of Citadel

Warden is part of the Citadel homelab ecosystem:

| Service | URL | Description |
|---------|-----|-------------|
| Situation Monitor | monitor.cluster.local | Real-time infrastructure dashboard |
| Warden | warden.cluster.local | AI command interface |
| BookStack | wiki.cluster.local | Documentation |
| Grafana | grafana.cluster.local | Metrics visualization |

## License

MIT
