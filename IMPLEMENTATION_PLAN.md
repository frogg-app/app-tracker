# App Tracker Implementation Plan

## Status: ✅ COMPLETED

The application has been updated to use **real data** from agents instead of fake/demo data.

---

## What Was Done

### Phase 1: Server-Side Changes
- Added `DEMO_MODE` environment variable (`server/src/config/index.ts`)
- Modified `AgentManager` to conditionally start demo data generator only when `DEMO_MODE=true`
- Made read-only data endpoints publicly accessible (`/data`, `/processes`, `/ports`, `/system`, `/containers`, `/agents`)

### Phase 2: Agent Push Client
- Created `agent/internal/push/client.go` - WebSocket client for pushing data to server
- Integrated push client into `agent/cmd/agent/main.go`
- Added environment variable bindings for push configuration:
  - `APPTRACKER_PUSH_ENABLED=true`
  - `APPTRACKER_SERVER_WS_URL=ws://server:3001/ws`
  - `APPTRACKER_PUSH_INTERVAL=10s`
  - `APPTRACKER_COLLECT_INTERVAL=10s`

### Phase 3: Docker Compose Configuration
- Added `networks: apptracker` to agent-demo service
- Configured push mode environment variables for agent
- Agent now pushes real metrics to server every 10 seconds

---

## Verification Results

```bash
# Agent collects real data
curl http://localhost:32402/api/v1/data
# Returns: processes, ports, system info from agent container

# Server receives and aggregates data
curl http://localhost:32401/api/v1/data
# Returns: Real data pushed from agents

# UI displays real data via WebSocket
# Open http://localhost:32400 in browser
```

---

## Known Issues (Non-Critical)

### Docker Collector API Version Mismatch
The agent's Docker collector shows this error:
```
client version 1.43 is too old. Minimum supported API version is 1.44
```
**Impact**: Container metrics not collected
**Fix**: Update Docker client library in `agent/go.mod` or negotiate API version

### Systemd Collector Not Available in Container
The agent running inside a container cannot access the host's systemd:
```
dial unix /var/run/dbus/system_bus_socket: connect: no such file or directory
```
**Impact**: Systemd unit metrics not collected
**Fix**: Mount the host's D-Bus socket or run agent directly on host

---

## Environment Variables Reference

### Server
| Variable | Default | Description |
|----------|---------|-------------|
| `DEMO_MODE` | `false` | Enable fake data generation for demos |
| `NODE_ENV` | `development` | Environment mode |
| `PORT` | `3001` | Server port |

### Agent
| Variable | Default | Description |
|----------|---------|-------------|
| `APPTRACKER_PUSH_ENABLED` | `false` | Enable push mode |
| `APPTRACKER_SERVER_WS_URL` | - | WebSocket URL for push mode |
| `APPTRACKER_PUSH_INTERVAL` | `10s` | Push interval |
| `APPTRACKER_COLLECT_INTERVAL` | `10s` | Collection interval |
| `APPTRACKER_ENABLE_DOCKER` | `true` | Enable Docker collector |

---

## Quick Start

```bash
# Start full stack with agent
docker compose -f docker-compose.yml --profile with-agent up -d

# Verify data flow
curl http://localhost:32401/api/v1/data

# Access UI
open http://localhost:32400
```

---

## Rollback to Demo Mode

To re-enable fake data for demonstrations:

```bash
# Set DEMO_MODE=true in docker-compose.yml or run:
docker compose up -d -e DEMO_MODE=true
```
