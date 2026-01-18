# Security Documentation

## Overview

App Tracker is designed with security as a core consideration. This document outlines the threat model, security controls, and best practices for deploying the application securely.

## Threat Model

### Assets

1. **System Data**: Process lists, open ports, service information, container details
2. **User Credentials**: Admin passwords, API tokens, JWT secrets
3. **Audit Logs**: Compliance and forensic data
4. **Agent-Server Communication**: Real-time system metrics

### Threat Actors

| Actor | Motivation | Capability |
|-------|-----------|------------|
| External Attacker | Data theft, system compromise | Network access, exploit knowledge |
| Malicious Insider | Data exfiltration, sabotage | Authenticated access, system knowledge |
| Compromised Agent | Pivot point, false data injection | Local system access |

### STRIDE Analysis

#### Spoofing

| Threat | Risk | Mitigation |
|--------|------|------------|
| Fake agent registration | High | Agent authentication with tokens/certificates |
| User impersonation | High | JWT tokens with short expiry, refresh tokens |
| Session hijacking | Medium | Secure cookies, HTTPS only |

#### Tampering

| Threat | Risk | Mitigation |
|--------|------|------------|
| Modified agent data | Medium | TLS encryption, message signing |
| Database modification | High | SQLite WAL mode, audit logging |
| Configuration changes | Medium | Config file permissions, audit trail |

#### Repudiation

| Threat | Risk | Mitigation |
|--------|------|------------|
| Denied actions | Medium | Comprehensive audit logging |
| Log tampering | High | Append-only logs, log forwarding |

#### Information Disclosure

| Threat | Risk | Mitigation |
|--------|------|------------|
| Credential exposure | Critical | bcrypt hashing, secret management |
| Data in transit exposure | High | TLS 1.3 for all connections |
| Log data leakage | Medium | Log sanitization, access controls |

#### Denial of Service

| Threat | Risk | Mitigation |
|--------|------|------------|
| API flooding | Medium | Rate limiting, request throttling |
| WebSocket exhaustion | Medium | Connection limits, ping/pong timeouts |
| Agent overload | Low | Collection interval limits |

#### Elevation of Privilege

| Threat | Risk | Mitigation |
|--------|------|------------|
| RBAC bypass | High | Server-side role enforcement |
| Container escape | Critical | Non-root containers, seccomp profiles |
| Agent privilege abuse | High | Minimal required capabilities |

## Security Controls

### Authentication

1. **User Authentication**
   - Password-based with bcrypt hashing (cost factor 12)
   - JWT tokens for session management
   - Configurable token expiration (default: 24h)
   - Refresh token rotation

2. **Agent Authentication**
   - Pre-shared API tokens
   - Optional mTLS for production deployments
   - Token rotation support

3. **API Authentication**
   - Bearer token (JWT) for user API access
   - API token for programmatic access
   - Rate limiting per token

### Authorization

Role-Based Access Control (RBAC) with three roles:

| Role | Permissions |
|------|-------------|
| `admin` | Full access: user management, audit logs, all data |
| `operator` | Data read/write, agent management |
| `viewer` | Read-only access to dashboards and data |

### Data Protection

1. **In Transit**
   - TLS 1.2+ required for all connections
   - HSTS headers in production
   - WebSocket connections over WSS

2. **At Rest**
   - SQLite database with file-level encryption (optional)
   - Secrets stored in environment variables or secret manager
   - No sensitive data in logs

### Network Security

1. **Agent → Server**
   - Outbound HTTPS only
   - Certificate validation
   - No inbound connections required

2. **Client → Server**
   - CORS restrictions
   - CSP headers
   - XSS protection headers

### Container Security

1. **Base Images**
   - Alpine Linux (minimal attack surface)
   - Regular security updates
   - No unnecessary packages

2. **Runtime**
   - Non-root user (except agent for /proc access)
   - Read-only root filesystem (where possible)
   - Dropped capabilities
   - Seccomp profiles (Kubernetes)

3. **Agent Specific**
   - Runs with host PID namespace (required)
   - Read-only access to /proc and /sys
   - Docker socket access (optional, for container monitoring)

## Deployment Recommendations

### Production Checklist

- [ ] Generate strong JWT_SECRET (32+ characters)
- [ ] Change default admin password
- [ ] Enable TLS on all endpoints
- [ ] Configure CORS for specific origins
- [ ] Set up log forwarding
- [ ] Enable audit logging
- [ ] Configure rate limiting
- [ ] Review network policies
- [ ] Scan container images for vulnerabilities
- [ ] Set resource limits

### Kubernetes Security

```yaml
# Example PodSecurityPolicy / PodSecurityStandard
securityContext:
  runAsNonRoot: true
  readOnlyRootFilesystem: true
  allowPrivilegeEscalation: false
  capabilities:
    drop:
      - ALL
```

### Secret Management

Recommended solutions:
- Kubernetes Secrets (with encryption at rest)
- HashiCorp Vault
- AWS Secrets Manager
- Azure Key Vault
- External Secrets Operator

### Network Policies

```yaml
# Example: Restrict server to only receive from UI and agents
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: apptracker-server
spec:
  podSelector:
    matchLabels:
      app: apptracker-server
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: apptracker-ui
        - podSelector:
            matchLabels:
              app: apptracker-agent
      ports:
      - port: 32400
```

## Vulnerability Reporting

If you discover a security vulnerability, please:

1. **Do NOT** open a public issue
2. Email: security@apptracker.io
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We will acknowledge receipt within 48 hours and aim to provide a fix within 7 days for critical issues.

## Compliance Considerations

### SOC 2

- Audit logging for all administrative actions
- Access controls with RBAC
- Data encryption in transit and at rest

### GDPR

- Minimal data collection (system metrics only)
- No PII in standard operation
- Audit logs for data access tracking

### HIPAA

- Not designed for PHI storage
- Use additional controls if deployed in healthcare environments

## Security Updates

Subscribe to security advisories:
- GitHub Security Advisories
- Project mailing list

Regular dependency updates via:
- Dependabot for Node.js dependencies
- govulncheck for Go dependencies
