# Contributing to App Tracker

Thank you for your interest in contributing to App Tracker! This document provides guidelines and information for contributors.

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct. Be respectful, inclusive, and constructive in all interactions.

## Getting Started

### Prerequisites

- Go 1.21+
- Node.js 20+
- Docker and Docker Compose
- Git

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/app-tracker/app-tracker.git
   cd app-tracker
   ```

2. **Install dependencies**
   ```bash
   # Agent
   cd agent && go mod download && cd ..
   
   # Server
   cd server && npm install && cd ..
   
   # UI
   cd ui && npm install && cd ..
   ```

3. **Start development servers**
   ```bash
   # Terminal 1: Server
   cd server && npm run dev
   
   # Terminal 2: UI
   cd ui && npm run dev
   
   # Terminal 3: Agent (requires root for full functionality)
   cd agent && go run ./cmd/agent serve
   ```

4. **Run tests**
   ```bash
   # Agent tests
   cd agent && go test ./...
   
   # Server tests
   cd server && npm test
   
   # UI tests
   cd ui && npm test
   ```

## How to Contribute

### Reporting Bugs

1. Check if the issue already exists
2. Create a new issue with:
   - Clear title
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (OS, versions)
   - Logs or screenshots if applicable

### Suggesting Features

1. Open a feature request issue
2. Describe the use case
3. Explain the proposed solution
4. Consider alternatives

### Pull Requests

1. **Fork and branch**
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make changes**
   - Follow code style guidelines
   - Add tests for new functionality
   - Update documentation

3. **Commit**
   - Use conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`
   - Write clear commit messages

4. **Push and create PR**
   - Link related issues
   - Describe changes
   - Add screenshots for UI changes

5. **Review process**
   - Address feedback
   - Keep commits clean (squash if needed)
   - Ensure CI passes

## Code Style

### Go (Agent)

- Follow [Effective Go](https://golang.org/doc/effective_go.html)
- Use `gofmt` and `golint`
- Error handling: always check errors
- Comments for exported functions

```go
// CollectProcesses gathers information about running processes.
// It reads from /proc filesystem and returns a slice of ProcessInfo.
func CollectProcesses(ctx context.Context) ([]ProcessInfo, error) {
    // Implementation
}
```

### TypeScript (Server & UI)

- ESLint configuration is provided
- Use TypeScript strict mode
- Prefer functional patterns
- Document complex logic

```typescript
/**
 * Validates and processes agent data submission.
 * @param agentId - Unique identifier for the agent
 * @param data - Collected system data
 * @returns Processed data or validation errors
 */
async function processAgentData(
  agentId: string,
  data: AgentData
): Promise<ProcessedData> {
  // Implementation
}
```

### React (UI)

- Functional components with hooks
- Zustand for state management
- TailwindCSS for styling
- Component file structure:
  ```
  ComponentName/
  ├── index.tsx       # Main component
  ├── styles.css      # Component-specific styles (if needed)
  └── types.ts        # TypeScript types
  ```

## Testing

### Unit Tests

- Test individual functions and components
- Mock external dependencies
- Aim for meaningful coverage, not 100%

### Integration Tests

- Test API endpoints with real database
- Test component interactions

### E2E Tests

- Test critical user flows
- Use Playwright for browser testing

## Documentation

- Update README.md for user-facing changes
- Add JSDoc/GoDoc comments for public APIs
- Include code examples where helpful
- Update CHANGELOG.md for releases

## Release Process

1. Version bump following semver
2. Update CHANGELOG.md
3. Create release tag
4. CI builds and publishes artifacts

## Architecture Decisions

Major architectural changes should be discussed via:
1. GitHub Discussion or Issue
2. Design document (for significant changes)
3. Team review

## Questions?

- Open a Discussion on GitHub
- Join our community chat
- Check existing documentation

Thank you for contributing! 🎉
