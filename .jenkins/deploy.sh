#!/bin/bash
set -e

# Stop existing container if running
docker-compose down 2>/dev/null || docker compose down 2>/dev/null || true

# Launch the app on port 8010
echo "=== Launching apptrackr on port 8010 ==="
export PORT=8010
docker-compose up -d || docker compose up -d

echo "App launched on port 8010"
