#!/bin/bash
# Quick development setup script
# Installs all dependencies for local development

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "Setting up App Tracker development environment..."
echo ""

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed"
    echo "Install it from: https://nodejs.org/"
    exit 1
fi
echo "✓ Node.js $(node --version)"

# Check for npm
if ! command -v npm &> /dev/null; then
    echo "Error: npm is not installed"
    exit 1
fi
echo "✓ npm $(npm --version)"

# Check for Go
if ! command -v go &> /dev/null; then
    echo "Error: Go is not installed"
    echo "Install it from: https://golang.org/"
    exit 1
fi
echo "✓ Go $(go version | awk '{print $3}')"

echo ""
echo "Installing dependencies..."
echo ""

# Install server dependencies
echo "Installing server dependencies..."
cd "$PROJECT_ROOT/server"
npm install
echo "✓ Server dependencies installed"

# Install UI dependencies
echo "Installing UI dependencies..."
cd "$PROJECT_ROOT/ui"
npm install
echo "✓ UI dependencies installed"

# Install agent dependencies
echo "Installing agent dependencies..."
cd "$PROJECT_ROOT/agent"
go mod download
echo "✓ Agent dependencies installed"

# Install E2E dependencies
echo "Installing E2E test dependencies..."
cd "$PROJECT_ROOT/e2e"
npm install
npx playwright install chromium
echo "✓ E2E dependencies installed"

cd "$PROJECT_ROOT"

echo ""
echo "Setup complete! 🎉"
echo ""
echo "To start development:"
echo ""
echo "  1. Start the server:"
echo "     cd server && npm run dev"
echo ""
echo "  2. Start the UI (new terminal):"
echo "     cd ui && npm run dev"
echo ""
echo "  3. Start the agent (new terminal, optional):"
echo "     cd agent && go run ./cmd/agent serve"
echo ""
echo "Or use Docker:"
echo "  ./scripts/demo.sh"
echo ""
