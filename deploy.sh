#!/bin/bash
# Warden Deployment Script
# Run on bastion after adding user to docker group:
#   sudo usermod -aG docker $USER && newgrp docker

set -e

REPO_URL="git@github.com:saltxd/warden.git"
DEPLOY_DIR="$HOME/warden"

echo "=== Warden Deployment ==="

# Check docker access
if ! docker info >/dev/null 2>&1; then
    echo "ERROR: Cannot access Docker. Run:"
    echo "  sudo usermod -aG docker \$USER"
    echo "  newgrp docker"
    exit 1
fi

# Clone or update repo
if [ -d "$DEPLOY_DIR" ]; then
    echo "Updating existing deployment..."
    cd "$DEPLOY_DIR"
    git pull
else
    echo "Cloning repository..."
    git clone "$REPO_URL" "$DEPLOY_DIR"
    cd "$DEPLOY_DIR"
fi

# Build and start
echo "Building and starting containers..."
docker-compose down 2>/dev/null || true
docker-compose up -d --build

# Wait for containers
echo "Waiting for containers to start..."
sleep 5

# Check status
echo ""
echo "=== Container Status ==="
docker-compose ps

# Health check
echo ""
echo "=== Health Check ==="
curl -s http://localhost:3000/health 2>/dev/null && echo "" || echo "Health endpoint not ready yet"

echo ""
echo "=== Deployment Complete ==="
echo "Access Warden at:"
echo "  - Local: http://localhost:3000"
echo "  - After Traefik: https://warden.cluster.local"
