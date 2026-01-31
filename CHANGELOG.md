# Changelog

All notable changes to App Tracker are documented here. This file follows the
Keep a Changelog style and Semantic Versioning.

## [Unreleased]

### Added - Mobile Support & Screenshot Testing (2026-01-28)
- **Comprehensive mobile responsiveness** across all pages
  - Fully responsive layouts for mobile (375px), tablet (768px), and desktop (1920px+)
  - Touch-friendly button sizing (44×44px minimum touch targets) with ARIA labels
  - Progressive table column hiding on smaller screens
  - Responsive typography scaling (text-xs sm:text-sm patterns)
  - Responsive spacing and padding (p-3 sm:p-4 patterns)
- **Screenshot testing infrastructure**
  - Automated screenshot tests for all 5 application pages
  - Tests across 3 viewports (mobile, tablet, desktop) × 2 themes (light, dark) = 30+ base screenshots
  - Mobile navigation flow testing
  - Responsive component testing
  - Screenshot test suite at `e2e/tests/screenshots.spec.ts`
- **Documentation**
  - Comprehensive mobile support guidelines (`docs/MOBILE_SUPPORT.md`)
  - Screenshot testing documentation (`e2e/SCREENSHOT_TESTING.md`)
  - Screenshot test helper script (`scripts/screenshot-tests.sh`)
- **Mobile-optimized components**
  - Dashboard: Responsive card grids and chart sizing
  - Ports page: Progressive table columns, mobile-friendly filters
  - Services page: Responsive stat cards (2 cols mobile → 4 cols desktop)
  - Processes page: Sortable responsive tables
  - Containers page: Responsive grid (1 col mobile → 2 tablet → 3 desktop)
  - Layout: Touch-friendly navigation and search

### Changed - UI/UX Improvements (2026-01-28)
- All page headings now responsive (text-xl sm:text-2xl)
- Table cells use responsive padding (px-3 sm:px-4)
- Search inputs have better mobile UX with responsive widths
- Stat cards optimized for mobile with 2-column grid on small screens
- Charts reduced height on mobile (h-40 sm:h-48)
- System overview cards show responsive icon sizing
- Table footers show row counts and swipe hints on mobile
- Mobile sidebar close button improved with proper touch targets

### Improved - Accessibility (2026-01-28)
- Added ARIA labels to all interactive buttons
- Minimum 44×44px touch targets for all clickable elements
- Theme toggle button properly labeled for screen readers
- Navigation menu buttons have descriptive aria-labels

### Added - WebSocket & Infrastructure (2026-01-18)
- Implemented push-mode agent WebSocket client (`agent/internal/push/client.go`) that
  connects to the server `/ws` endpoint and pushes aggregated metrics.
- `DEMO_MODE` flag (server) to opt into demo/fake data; demo generator now disabled by default.
- `IMPLEMENTATION_PLAN.md` to track ongoing work and next steps.

### Changed
- Docker / infra
  - Updated `docker-compose.yml` host port mappings: UI -> 5010, API -> 5011, Agent -> 5012.
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
