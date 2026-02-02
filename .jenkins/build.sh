#!/bin/bash
set -e

# =============================================================================
# App Tracker Build Script (Docker Compose multi-service project)
# =============================================================================

echo "=== Building App Tracker (docker-compose) ==="

# Build all services with docker compose
docker compose build --no-cache

# Tag the built images for versioning
docker tag app-tracker-server:latest app-tracker:${VERSION:-latest}
docker tag app-tracker-server:latest app-tracker:${ENVIRONMENT:-dev}

echo "Build completed successfully!"
