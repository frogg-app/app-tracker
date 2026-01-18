# Changelog

All notable changes to App Tracker will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial release of App Tracker
- Go agent for Linux system data collection
  - Process discovery from /proc filesystem
  - Port scanning via ss/lsof
  - System metrics (CPU, memory, disk, network)
  - Systemd unit monitoring via D-Bus
  - Docker container monitoring
  - Kubernetes pod discovery via kubelet API
- Node.js backend server
  - REST API for data access
  - WebSocket real-time updates
  - SQLite database for persistence
  - JWT authentication
  - Role-based access control (RBAC)
  - Audit logging
  - Prometheus metrics endpoint
- React TypeScript SPA
  - Dashboard with system overview
  - Ports, Services, Processes, Containers pages
  - Dark/light theme support
  - Keyboard shortcuts
  - Responsive design
- Docker infrastructure
  - Multi-stage Dockerfiles
  - docker-compose.yml with healthchecks
  - Development overrides
- Kubernetes manifests
  - Deployments, Services, ConfigMaps
  - DaemonSet for agent
  - Ingress configuration
  - HorizontalPodAutoscaler
  - Helm chart
- CI/CD pipeline with GitHub Actions
- Comprehensive test suite
- Security documentation and threat model

## [0.1.0] - TBD

### Added
- MVP release

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
