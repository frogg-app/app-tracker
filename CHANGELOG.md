# Changelog

All notable changes to App Tracker are documented here. This file follows the
Keep a Changelog style and Semantic Versioning.

## [Unreleased] - 2026-01-18

### Added
- Implemented push-mode agent WebSocket client (`agent/internal/push/client.go`) that
  connects to the server `/ws` endpoint and pushes aggregated metrics.
- `DEMO_MODE` flag (server) to opt into demo/fake data; demo generator now disabled by default.
- `IMPLEMENTATION_PLAN.md` to track ongoing work and next steps.

### Changed
- Docker / infra
  - Updated `docker-compose.yml` host port mappings: UI -> 32400, API -> 32401, Agent -> 32402.
  - `ui/nginx.conf` updated to proxy `/api/` and `/ws` to the server (fixed WebSocket routing).
  - Agent Dockerfile: expose `9090` and listen on `0.0.0.0` in container runtime.
  - Non-root user group GID adjusted for container builds.
- Build / tooling
  - Switch `ui` production build to handle missing lockfile (use `npm install` fallback during CI/dev overrides).
  - Generated `go.sum` and fixed TypeScript compiler errors to make server and agent images buildable.
- Server
  - WebSocket handler left intact; server now accepts real agent `agent_data` messages and broadcasts to UI.
  - Temporary read-only GET endpoints are permitted for verification (plan to restore strict auth).
- Agent
  - Added configuration bindings for push client (server URL and interval), and robust duration parsing.
  - Agent now attached to `apptracker` network in `docker-compose.yml` so `server` hostname resolves.

### Fixed
- Resolved multiple build-time and runtime issues so full stack can be built and launched via Docker Compose.
  - TypeScript unused-variable errors fixed; `tsconfig` adjustments applied.
  - NGINX proxy misconfiguration for WebSocket fixed so UI receives live updates.
  - Port conflicts and host-binding defaults updated (`HOST=0.0.0.0` for server).

### Known Issues / TODO
- Docker collector API mismatch: in-container Docker SDK reports API version older than required; container metrics may be incomplete. (Next: upgrade client or implement API negotiation.)
- `systemd` collector cannot access host D-Bus when agent runs inside a container; recommend host-based agent or D-Bus socket mount for full systemd metrics.
- Authentication: read-only endpoints were temporarily relaxed for verification — restore agent registration and token-based auth for production.

## Next Steps
- Fix Docker collector API version mismatch in `agent/internal/collector/docker.go`.
- Restore secure agent registration + token flow and revert temporary auth relaxations.
- Document recommended host mounts for systemd and Docker collectors for containerized agent deployments.

---

## Release Notes Template

### [X.Y.Z] - YYYY-MM-DD

#### Added
- New features

#### Changed
- Changes in existing functionality

#### Deprecated
- Soon-to-be removed features

#### Removed
- Removed features

#### Fixed
- Bug fixes

#### Security
- Vulnerability fixes
