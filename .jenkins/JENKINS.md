# Jenkins Build Configuration

This project uses self-managed Jenkins build scripts located in the `.jenkins/` folder.

## Quick Start

Your build is controlled by these files:

| File | Purpose |
|------|---------|
| `build.sh` | Build your Docker image or compile your code |
| `deploy.sh` | Deploy/run your container after successful build |
| `config.yaml` | Optional build configuration (future use) |

## When to Update Build Scripts

Update your `.jenkins/build.sh` or `.jenkins/deploy.sh` when you:

| Change | Action Required |
|--------|-----------------|
| Add new npm/pip dependencies | Usually no change needed (Dockerfile handles it) |
| Change Dockerfile significantly | Verify `build.sh` still works |
| Add environment variables | Add to `deploy.sh` with `-e VAR=value` |
| Change exposed ports | Update `-p` flag in `deploy.sh` |
| Add volume mounts | Add `-v` flags in `deploy.sh` |
| Add build-time secrets | Add to `build.sh` with `--build-arg` |
| Switch from Docker to Makefile | Update `build.sh` to run `make build` |
| Add pre/post build steps | Add commands to `build.sh` |

## Environment Variables

The following environment variables are available in your scripts:

```bash
$PROJECT_NAME      # Human-readable project name
$REPO_NAME         # GitHub repository name
$CONTAINER_NAME    # Docker container name (for stopping/starting)
$DEV_PORT          # External port on the dev server
$INTERNAL_PORT     # Port the app listens on inside the container
$VOLUME_MOUNT      # Pre-configured volume mount string (if hasDatabase=true)
$HAS_DATABASE      # "true" or "false"
$FRAMEWORK         # "nextjs", "node", "python", "go", or "static"
$BUILD_NUMBER      # Jenkins build number (auto-set by Jenkins)
```

## Example: build.sh

```bash
#!/bin/bash
set -e

echo "=== Building $PROJECT_NAME ==="

# Simple Docker build
docker build -t $REPO_NAME .

# OR with build arguments
docker build \
  --build-arg NODE_ENV=production \
  --build-arg BUILD_NUMBER=$BUILD_NUMBER \
  -t $REPO_NAME .

# OR with version tags
docker build \
  -t $REPO_NAME:$BUILD_NUMBER \
  -t $REPO_NAME:latest \
  .

# OR using Makefile
make build

echo "Build completed!"
```

## Example: deploy.sh

```bash
#!/bin/bash
set -e

echo "=== Deploying $PROJECT_NAME ==="

# Stop existing container
docker stop $CONTAINER_NAME 2>/dev/null || true
docker rm $CONTAINER_NAME 2>/dev/null || true

# Basic deployment
docker run -d \
  --name $CONTAINER_NAME \
  -p $DEV_PORT:$INTERNAL_PORT \
  --restart unless-stopped \
  $REPO_NAME

# OR with environment variables
docker run -d \
  --name $CONTAINER_NAME \
  -p $DEV_PORT:$INTERNAL_PORT \
  -e DATABASE_URL="file:/app/data/db.sqlite" \
  -e NODE_ENV=production \
  --restart unless-stopped \
  $REPO_NAME

# OR with volume mounts
docker run -d \
  --name $CONTAINER_NAME \
  -p $DEV_PORT:$INTERNAL_PORT \
  -v "$HOME/${REPO_NAME}-data:/app/data" \
  -v "$HOME/.config:/app/config:ro" \
  --restart unless-stopped \
  $REPO_NAME

echo "Deployed on port $DEV_PORT"
```

## Testing Locally

Before committing, test your scripts locally:

```bash
# Set environment variables
export PROJECT_NAME="My Project"
export REPO_NAME="my-project"
export CONTAINER_NAME="my-project-test"
export DEV_PORT="3000"
export INTERNAL_PORT="3000"
export BUILD_NUMBER="local"

# Run build
chmod +x .jenkins/build.sh
./.jenkins/build.sh

# Run deploy (optional - will start container)
chmod +x .jenkins/deploy.sh
./.jenkins/deploy.sh
```

## Troubleshooting

### Build fails with "permission denied"
```bash
chmod +x .jenkins/build.sh .jenkins/deploy.sh
```

### Container won't start
Check logs: `docker logs $CONTAINER_NAME`

### Port already in use
Another container may be using the port. Check with:
```bash
docker ps | grep $DEV_PORT
```

## CI/CD Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  git push   │────▶│   Jenkins   │────▶│   Docker    │
└─────────────┘     └──────┬──────┘     └─────────────┘
                           │
                    ┌──────▼──────┐
                    │  .jenkins/  │
                    │  build.sh   │
                    │  deploy.sh  │
                    └─────────────┘
```

1. You push code to GitHub
2. Jenkins pulls the latest code
3. Jenkins runs `.jenkins/build.sh` (or default if missing)
4. Jenkins runs `.jenkins/deploy.sh` (or default if missing)
5. App is live on `https://<subdomain>.dev.frogg.app`

## Getting Help

- **Build failures**: Ask the AI assistant to run `get_build_failure_analysis`
- **View logs**: Ask for `get_build_log` 
- **Trigger rebuild**: Ask for `trigger_build`
