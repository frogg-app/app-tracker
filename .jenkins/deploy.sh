#!/bin/bash
set -e

# =============================================================================
# App Tracker Deploy Script (Docker Compose multi-service project)
# =============================================================================

echo "=== Deploying App Tracker to $ENVIRONMENT ==="

if [ "$ENVIRONMENT" = "stable" ]; then
    echo ">>> Deploying to production (${DEPLOY_SERVER})"
    
    # Save images and transfer
    docker save app-tracker-server:latest -o /tmp/app-tracker-server.tar
    docker save app-tracker-ui:latest -o /tmp/app-tracker-ui.tar
    
    scp -o StrictHostKeyChecking=no /tmp/app-tracker-server.tar /tmp/app-tracker-ui.tar frogg@${DEPLOY_SERVER}:/tmp/
    
    # Load images on remote server and deploy
    ssh -o StrictHostKeyChecking=no frogg@${DEPLOY_SERVER} bash << 'REMOTE'
set -e

# Load the images
docker load -i /tmp/app-tracker-server.tar
docker load -i /tmp/app-tracker-ui.tar
rm -f /tmp/app-tracker-server.tar /tmp/app-tracker-ui.tar

# Stop existing containers
docker stop apptracker-server apptracker-ui 2>/dev/null || true
docker rm apptracker-server apptracker-ui 2>/dev/null || true

# Create network if not exists
docker network create apptracker 2>/dev/null || true

# Create volume if not exists  
docker volume create apptracker-server-data 2>/dev/null || true

# Run server
docker run -d \
  --name apptracker-server \
  --network apptracker \
  -p 5011:3001 \
  -v apptracker-server-data:/app/data \
  -e NODE_ENV=production \
  -e PORT=3001 \
  -e HOST=0.0.0.0 \
  -e DATABASE_PATH=/app/data/apptracker.db \
  -e CORS_ORIGINS=https://apptrackr.frogg.app,http://localhost:5010 \
  --health-cmd "wget --no-verbose --tries=1 --spider http://127.0.0.1:3001/health || exit 1" \
  --health-interval 30s \
  --health-timeout 5s \
  --health-retries 3 \
  --health-start-period 10s \
  --restart unless-stopped \
  app-tracker-server:latest

# Wait for server to be healthy
echo "Waiting for server..."
sleep 10

# Run UI
docker run -d \
  --name apptracker-ui \
  --network apptracker \
  -p 5010:80 \
  -e API_URL=/api \
  --restart unless-stopped \
  app-tracker-ui:latest

echo "Deployed App Tracker to production!"
REMOTE
    
    rm -f /tmp/app-tracker-server.tar /tmp/app-tracker-ui.tar
else
    echo ">>> Deploying locally for dev"
    export COMPOSE_PROJECT_NAME=apptracker
    
    # Stop existing containers
    docker compose down || true
    docker compose up -d
fi

echo "=== Deployment complete ==="
