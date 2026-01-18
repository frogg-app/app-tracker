# Linux Server Rapid Prototyping & Service Tracker

[![CI](https://github.com/your-org/app-tracker/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/app-tracker/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A full-stack application for discovering and inspecting applications, services, and ports on Linux servers. Designed for developers and operations teams who need rapid visibility into their infrastructure.

![Dashboard Preview](docs/wireframes/dashboard-preview.svg)

## 🚀 Quick Start

### One-Command Demo

```bash
# Clone and run the complete demo stack
git clone https://github.com/your-org/app-tracker.git
cd app-tracker
./scripts/demo.sh
```

This boots the complete stack with sample data. Access the UI at **http://localhost:32400**

### Docker Compose (Recommended)

```bash
docker-compose up --build
```

Services (host ports):
- **UI**: http://localhost:32400
- **API**: http://localhost:32401
- **Agent**: http://localhost:32402/metrics

## 📦 Features

### Port & Process Discovery
- Scan and list open TCP/UDP ports with bind addresses
- Identify owning PID, process cmdline, user, and binary path
- Associate with systemd units (when applicable)
- Docker/Podman container ID & image detection
- Kubernetes pod identification (when kubelet present)

### Service Enumeration
- List systemd units, processes, and containers
- Per-service detail views:
  - Command-line arguments
  - Environment variables (read-only)
  - Working directory
  - Open files and sockets
  - Listening ports
  - Real-time log tailing
  - Network connections

### Resource Monitoring
- Real-time and historical metrics:
  - CPU usage
  - Memory consumption
  - Disk I/O
  - Network I/O
  - File descriptor counts
- Aggregate host capacity view
- Time-series graphs with Recharts
- Top-talkers analysis

### Modern UI/UX
- React + TypeScript SPA
- Mobile-responsive dashboards
- Searchable/filterable service list
- Color-coded port/service maps
- Drill-down detail panels
- Dark/Light themes
- Keyboard shortcuts (see below)
- Clear onboarding flow

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser (React UI)                       │
│                    - Dashboards, Charts, Filters                 │
└─────────────────────┬───────────────────────────────────────────┘
                      │ HTTPS/WSS
┌─────────────────────▼───────────────────────────────────────────┐
│                     Backend Server (Node.js)                     │
│  - REST API        - WebSocket streaming                         │
│  - Auth/RBAC       - SQLite metadata store                       │
│  - Audit logging   - Prometheus integration                      │
└─────────────────────┬───────────────────────────────────────────┘
                      │ TLS + Token Auth
┌─────────────────────▼───────────────────────────────────────────┐
│                        Agent (Go)                                │
│  - /proc parsing   - ss/lsof integration                         │
│  - systemd D-Bus   - Docker/Podman APIs                          │
│  - kubelet API     - Prometheus metrics exporter                 │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Agent** collects metrics from Linux host via:
   - `/proc` filesystem (processes, CPU, memory)
   - `ss`/`lsof` (network connections, open files)
   - systemd D-Bus API (service status)
   - Docker/Podman socket (container info)
   - Kubelet API (Kubernetes pods)

2. **Server** aggregates data from multiple agents:
   - REST API for queries and configuration
   - WebSocket for real-time updates
   - SQLite for metadata persistence
   - Optional Prometheus for time-series

3. **UI** presents data with:
   - Real-time dashboards
   - Historical charts
   - Drill-down views

## 🔧 Installation

### Prerequisites

- Docker 20.10+ and Docker Compose 2.0+
- (For development) Node.js 18+, Go 1.21+, pnpm

### Production Deployment

See [infra/README.md](infra/README.md) for:
- Docker Swarm deployment
- Kubernetes manifests
- Helm chart installation

### Development Setup

```bash
# Install dependencies
pnpm install

# Start all services in development mode
docker-compose -f docker-compose.yml -f docker-compose.override.yml up --build

# Or run services individually
cd agent && go run ./cmd/agent
cd server && pnpm dev
cd ui && pnpm dev
```

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `/` | Focus search |
| `p` | Open ports view |
| `s` | Open services view |
| `c` | Open containers view |
| `d` | Toggle dark/light mode |
| `r` | Refresh data |
| `Esc` | Close modal/panel |
| `?` | Show help |

## 🔐 Security

### Threat Model Summary

See [docs/SECURITY.md](docs/SECURITY.md) for the complete threat model.

**Key Security Features:**
- TLS encryption for all communications
- Agent pairing tokens with HMAC verification
- Role-based access control (RBAC)
- Audit logging for all actions
- Non-root container runtime
- Read-only collectors by default
- Secrets management via Docker/K8s secrets

**Least Privilege Guidelines:**
- Agent runs as non-root with capabilities: `CAP_NET_ADMIN`, `CAP_SYS_PTRACE`
- Server runs as unprivileged user
- Database files have restricted permissions
- API tokens rotated every 24 hours by default

### Secure Defaults

```yaml
# All security features enabled by default
security:
  tls: true
  mtls: false  # Optional mutual TLS
  audit_log: true
  token_rotation: 24h
  rbac: true
```

## 📊 Observability

### Self-Metrics

All components expose Prometheus metrics (internal service ports shown; host port mappings documented above):

- **Agent (internal)**: `http://agent:9090/metrics` (host: `http://localhost:32402/metrics`)
- **Server (internal)**: `http://server:3001/metrics` (host: `http://localhost:32401/metrics`)

### Structured Logging

All logs are JSON-formatted for easy parsing:

```json
{
  "level": "info",
  "ts": "2025-01-18T10:00:00Z",
  "caller": "collector/proc.go:42",
  "msg": "collected process metrics",
  "process_count": 150,
  "duration_ms": 12
}
```

### Low-Overhead Deployment

For development servers with limited resources:

```bash
# Use lightweight configuration
docker-compose -f docker-compose.yml -f docker-compose.lightweight.yml up
```

This reduces collection frequency and disables non-essential features.

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Unit tests only
pnpm test:unit

# Integration tests
pnpm test:integration

# End-to-end tests (requires Docker)
pnpm test:e2e
```

## 📁 Repository Structure

```
app-tracker/
├── agent/                 # Go agent
│   ├── cmd/agent/         # Main entrypoint
│   ├── internal/          # Internal packages
│   │   ├── collector/     # Data collectors
│   │   ├── api/           # HTTP/metrics server
│   │   └── config/        # Configuration
│   └── pkg/               # Public packages
├── server/                # Node.js backend
│   ├── src/
│   │   ├── api/           # REST endpoints
│   │   ├── ws/            # WebSocket handlers
│   │   ├── db/            # Database layer
│   │   ├── auth/          # Authentication
│   │   └── metrics/       # Prometheus metrics
│   └── tests/
├── ui/                    # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom hooks
│   │   ├── store/         # State management
│   │   └── utils/         # Utilities
│   └── tests/
├── infra/                 # Infrastructure
│   ├── docker/            # Dockerfiles
│   ├── k8s/               # Kubernetes manifests
│   └── helm/              # Helm charts
├── tests/                 # Integration & E2E tests
├── scripts/               # Utility scripts
└── docs/                  # Documentation
```

## 🔌 Extending

### Plugin Collector API

Create custom collectors by implementing the `Collector` interface:

```go
type Collector interface {
    Name() string
    Collect(ctx context.Context) ([]Metric, error)
    Interval() time.Duration
}
```

See [docs/PLUGINS.md](docs/PLUGINS.md) for detailed examples.

## 🛣️ MVP Checklist

### Phase 1: Core Infrastructure ✅
- [x] Agent basic structure
- [x] Server basic structure
- [x] UI scaffolding
- [x] Docker Compose setup

### Phase 2: Data Collection
- [x] Process enumeration via /proc
- [x] Port scanning via ss
- [x] systemd integration
- [x] Docker container detection
- [ ] Kubernetes pod detection (in progress)

### Phase 3: UI Features
- [x] Dashboard layout
- [x] Port list view
- [x] Service list view
- [x] Real-time charts
- [x] Dark/light theme
- [ ] Mobile optimization (in progress)

### Phase 4: Production Ready
- [x] TLS support
- [x] Authentication
- [x] RBAC
- [x] Audit logging
- [ ] Helm chart (in progress)

## 📝 License

MIT License - see [LICENSE](LICENSE) for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `pnpm test`
5. Submit a pull request

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.
