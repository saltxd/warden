#!/usr/bin/env python3
"""Push Warden documentation to BookStack

Usage:
    export BOOKSTACK_TOKEN_ID="your-token-id"
    export BOOKSTACK_TOKEN_SECRET="your-token-secret"
    python3 push-to-bookstack.py
"""

import requests
import os
import sys

BOOKSTACK_URL = "https://docs.cluster.local"
TOKEN_ID = os.environ.get("BOOKSTACK_TOKEN_ID")
TOKEN_SECRET = os.environ.get("BOOKSTACK_TOKEN_SECRET")

if not TOKEN_ID or not TOKEN_SECRET:
    print("Error: Set BOOKSTACK_TOKEN_ID and BOOKSTACK_TOKEN_SECRET environment variables")
    sys.exit(1)

headers = {
    "Authorization": f"Token {TOKEN_ID}:{TOKEN_SECRET}",
    "Content-Type": "application/json"
}

def create_book(name, description):
    resp = requests.post(
        f"{BOOKSTACK_URL}/api/books",
        headers=headers,
        json={"name": name, "description": description}
    )
    resp.raise_for_status()
    return resp.json()

def create_chapter(book_id, name, description=""):
    resp = requests.post(
        f"{BOOKSTACK_URL}/api/chapters",
        headers=headers,
        json={"book_id": book_id, "name": name, "description": description}
    )
    resp.raise_for_status()
    return resp.json()

def create_page(chapter_id=None, book_id=None, name="", content=""):
    data = {"name": name, "markdown": content}
    if chapter_id:
        data["chapter_id"] = chapter_id
    elif book_id:
        data["book_id"] = book_id
    resp = requests.post(
        f"{BOOKSTACK_URL}/api/pages",
        headers=headers,
        json=data
    )
    resp.raise_for_status()
    return resp.json()

# Create Warden book
print("Creating Warden book...")
book = create_book("Warden", "Homelab Command Interface - AI-powered SSH access")
book_id = book["id"]
print(f"Book created: {book['slug']}")

# Overview page at book level
print("Creating Overview page...")
create_page(book_id=book_id, name="Overview", content="""
# Warden

Warden is a terminal-style chat interface for managing homelab infrastructure using Claude Code.

## What is Warden?

- **AI Command Interface** - Natural language control of your homelab
- **SSH Gateway** - Access all nodes through a single interface  
- **Terminal Aesthetic** - Matches the Citadel Situation Monitor style

## Quick Links

- GitHub: https://github.com/saltxd/warden
- Live: https://warden.cluster.local
- Situation Monitor: https://monitor.cluster.local

## Architecture

```
Browser → bastion (10.0.2.10)
           ├── Frontend (React)
           ├── Backend (FastAPI)
           └── Claude Code → SSH → K3s/Proxmox nodes
```
""")

# Getting Started chapter
print("Creating Getting Started chapter...")
chapter = create_chapter(book_id, "Getting Started")
chapter_id = chapter["id"]

create_page(chapter_id=chapter_id, name="Installation", content="""
# Installation

## Prerequisites

- Docker & Docker Compose
- SSH access to homelab nodes
- Claude Code installed on bastion host (bastion)

## Quick Install

```bash
# Clone repository
git clone git@github.com:saltxd/warden.git
cd warden

# Start services
docker-compose up -d --build
```

## Access

Open `http://localhost:3000` or configure Traefik for `warden.cluster.local`
""")

create_page(chapter_id=chapter_id, name="Configuration", content="""
# Configuration

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `BUILD_SERVER_HOST` | SSH host for Claude Code | `10.0.2.10` |
| `BUILD_SERVER_USER` | SSH user | `admin` |
| `CLAUDE_CODE_PATH` | Path to Claude binary | `/home/admin/.claude/local/claude` |

## Node Configuration

| Node | IP | Role |
|------|-----|------|
| bastion | 10.0.2.10 | Local (Claude Code host) |
| k3s-cp-1 | 10.0.1.10 | K3s Control Plane |
| k3s-cp-2 | 10.0.1.11 | K3s Control Plane |
| k3s-cp-3 | 10.0.1.13 | K3s Control Plane |
| k3s-worker-1 | 10.0.1.12 | K3s Worker |
""")

# Architecture chapter
print("Creating Architecture chapter...")
chapter = create_chapter(book_id, "Architecture")
chapter_id = chapter["id"]

create_page(chapter_id=chapter_id, name="System Design", content="""
# System Design

## Component Overview

```
┌─────────────────────────────────────────────────┐
│ Browser (warden.cluster.local)                        │
│    │                                            │
│    ▼                                            │
│ bastion (10.0.2.10)                        │
│ ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│ │ Frontend │──│ Backend  │──│  Claude  │       │
│ │ (React)  │  │(FastAPI) │  │   Code   │       │
│ └──────────┘  └──────────┘  └────┬─────┘       │
│                                  │ SSH         │
└──────────────────────────────────┼─────────────┘
                                   │
          ┌────────────────────────┼────────────┐
          ▼          ▼             ▼            ▼
       k3s-cp-1     k3s-cp-2     k3s-cp-3   wt-worker
```

## Data Flow

1. User types natural language command in browser
2. WebSocket sends message to FastAPI backend
3. Backend SSHes to bastion and runs Claude Code
4. Claude Code interprets command, SSHes to target nodes
5. Output streams back via WebSocket
6. Frontend displays response in terminal style
""")

# Usage Guide chapter
print("Creating Usage Guide chapter...")
chapter = create_chapter(book_id, "Usage Guide")
chapter_id = chapter["id"]

create_page(chapter_id=chapter_id, name="Commands", content="""
# Commands

## Quick Actions

Click any quick action button to populate the input:

- **Check K3s cluster status** - Get node and pod health
- **What's on proxmox-1?** - Show services on proxmox-1 node
- **Show disk usage** - Check storage across nodes
- **List pods** - Show all Kubernetes pods

## Example Queries

- "Check K3s cluster status"
- "Show disk usage on all nodes"
- "List pods in kube-system namespace"
- "Check logs for grafana pod"
- "What's the memory usage on proxmox-0?"
- "Restart the bookstack pod"

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Enter | Send message |
| ↑/↓ | Navigate command history |
| Ctrl+L | Clear screen |
""")

# Deployment chapter
print("Creating Deployment chapter...")
chapter = create_chapter(book_id, "Deployment")
chapter_id = chapter["id"]

create_page(chapter_id=chapter_id, name="Docker Compose", content="""
# Docker Compose Deployment

## Deploy to bastion

```bash
# SSH to bastion
ssh bastion

# Clone repo
git clone git@github.com:saltxd/warden.git
cd warden

# Build and start
docker-compose up -d --build

# Verify
docker-compose ps
docker-compose logs -f
```

## Maintenance Commands

```bash
# View logs
docker-compose logs -f

# Restart
docker-compose restart

# Update
git pull && docker-compose up -d --build

# Full rebuild
docker-compose down && docker-compose up -d --build
```
""")

create_page(chapter_id=chapter_id, name="Traefik Setup", content="""
# Traefik Configuration

## Add Route

Add to Traefik dynamic config:

```yaml
# /etc/traefik/dynamic/warden.yml
http:
  routers:
    warden:
      rule: "Host(`warden.cluster.local`)"
      service: warden
      entryPoints:
        - web
        - websecure
      tls:
        certResolver: letsencrypt

  services:
    warden:
      loadBalancer:
        servers:
          - url: "http://10.0.2.10:3000"
```

## DNS

Add to AdGuard DNS rewrites:
```
warden.cluster.local -> 10.0.2.20 (Traefik IP)
```
""")

print(f"\nDocumentation created: {BOOKSTACK_URL}/books/{book['slug']}")
print("Done!")
