#!/bin/bash
set -e

# =============================================================================
# App Tracker Build Script (Docker Compose multi-service project)
# =============================================================================

echo "=== Building App Tracker (docker-compose) ==="

# Set compose project name to avoid directory-based naming
export COMPOSE_PROJECT_NAME=apptracker

# Build all services with docker compose
docker compose build --no-cache

# The built images will be named apptracker-server and apptracker-ui
# Tag them for deployment
docker tag apptracker-server:latest app-tracker-server:latest
docker tag apptracker-server:latest app-tracker-server:${VERSION:-latest}
docker tag apptracker-ui:latest app-tracker-ui:latest
docker tag apptracker-ui:latest app-tracker-ui:${VERSION:-latest}

echo "Build completed successfully!"
