#!/bin/bash
# App Tracker Demo Launcher
# One-command setup for local development and demonstration
# Usage: ./scripts/demo.sh [--dev|--prod|--clean]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Functions
print_banner() {
    echo -e "${BLUE}"
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║                                                           ║"
    echo "║     █████╗ ██████╗ ██████╗    ████████╗██████╗  █████╗   ║"
    echo "║    ██╔══██╗██╔══██╗██╔══██╗   ╚══██╔══╝██╔══██╗██╔══██╗  ║"
    echo "║    ███████║██████╔╝██████╔╝      ██║   ██████╔╝███████║  ║"
    echo "║    ██╔══██║██╔═══╝ ██╔═══╝       ██║   ██╔══██╗██╔══██║  ║"
    echo "║    ██║  ██║██║     ██║           ██║   ██║  ██║██║  ██║  ║"
    echo "║    ╚═╝  ╚═╝╚═╝     ╚═╝           ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝  ║"
    echo "║                                                           ║"
    echo "║          Linux Server Rapid Prototyping Tracker           ║"
    echo "╚═══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

check_requirements() {
    echo -e "${YELLOW}Checking requirements...${NC}"
    
    local missing=0
    
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}✗ Docker is not installed${NC}"
        missing=1
    else
        echo -e "${GREEN}✓ Docker$(docker --version | cut -d' ' -f3)${NC}"
    fi
    
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        echo -e "${RED}✗ Docker Compose is not installed${NC}"
        missing=1
    else
        echo -e "${GREEN}✓ Docker Compose${NC}"
    fi
    
    if [ $missing -eq 1 ]; then
        echo -e "${RED}Please install missing requirements and try again.${NC}"
        exit 1
    fi
    
    echo ""
}

start_demo() {
    echo -e "${YELLOW}Starting App Tracker demo environment...${NC}"
    echo ""
    
    cd "$PROJECT_ROOT"
    
    # Build and start services
    echo -e "${BLUE}Building containers...${NC}"
    docker compose build
    
    echo -e "${BLUE}Starting services...${NC}"
    docker compose up -d
    
    # Wait for services to be healthy
    echo -e "${YELLOW}Waiting for services to be ready...${NC}"
    local max_attempts=30
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if docker compose ps | grep -q "healthy"; then
            break
        fi
        sleep 2
        attempt=$((attempt + 1))
        echo -n "."
    done
    echo ""
    
    # Check if services are running
    if docker compose ps | grep -q "Up"; then
        echo -e "${GREEN}✓ Services are running!${NC}"
        echo ""
        print_access_info
    else
        echo -e "${RED}✗ Some services failed to start${NC}"
        echo "Run 'docker compose logs' to see what went wrong"
        exit 1
    fi
}

start_dev() {
    echo -e "${YELLOW}Starting App Tracker development environment...${NC}"
    echo ""
    
    cd "$PROJECT_ROOT"
    
    # Check for Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}✗ Node.js is not installed${NC}"
        exit 1
    fi
    
    # Check for Go
    if ! command -v go &> /dev/null; then
        echo -e "${RED}✗ Go is not installed${NC}"
        exit 1
    fi
    
    # Install dependencies
    echo -e "${BLUE}Installing dependencies...${NC}"
    
    cd "$PROJECT_ROOT/server"
    npm install
    
    cd "$PROJECT_ROOT/ui"
    npm install
    
    cd "$PROJECT_ROOT/agent"
    go mod download
    
    cd "$PROJECT_ROOT"
    
    # Create a simple process manager
    echo -e "${BLUE}Starting development servers...${NC}"
    echo ""
    
    # Start server in background
    echo -e "${YELLOW}Starting API server on port 32400...${NC}"
    (cd "$PROJECT_ROOT/server" && npm run dev &)
    
    sleep 3
    
    # Start UI in background
    echo -e "${YELLOW}Starting UI dev server on port 5173...${NC}"
    (cd "$PROJECT_ROOT/ui" && npm run dev &)
    
    echo ""
    echo -e "${GREEN}Development servers started!${NC}"
    echo ""
    echo -e "  ${BLUE}UI:${NC}     http://localhost:5173"
    echo -e "  ${BLUE}API:${NC}    http://localhost:32400"
    echo ""
    echo -e "${YELLOW}To start the agent (requires root for full functionality):${NC}"
    echo -e "  cd agent && sudo go run ./cmd/agent serve"
    echo ""
    echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
    
    # Wait for interrupt
    wait
}

print_access_info() {
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "  ${GREEN}Dashboard:${NC}   http://localhost:3000"
    echo -e "  ${GREEN}API:${NC}         http://localhost:32400"
    echo -e "  ${GREEN}API Docs:${NC}    http://localhost:32400/api"
    echo ""
    echo -e "  ${YELLOW}Default Credentials:${NC}"
    echo -e "    Username: admin"
    echo -e "    Password: admin123"
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${YELLOW}Useful commands:${NC}"
    echo "  docker compose logs -f          # View logs"
    echo "  docker compose ps               # Check status"
    echo "  docker compose down             # Stop services"
    echo "  ./scripts/demo.sh --clean       # Remove all data"
    echo ""
}

stop_demo() {
    echo -e "${YELLOW}Stopping App Tracker...${NC}"
    cd "$PROJECT_ROOT"
    docker compose down
    echo -e "${GREEN}✓ All services stopped${NC}"
}

clean_demo() {
    echo -e "${YELLOW}Cleaning up App Tracker demo...${NC}"
    cd "$PROJECT_ROOT"
    
    # Stop containers
    docker compose down -v --remove-orphans
    
    # Remove images
    docker compose down --rmi local
    
    # Clean up any dangling images
    docker image prune -f
    
    echo -e "${GREEN}✓ Cleanup complete${NC}"
}

show_help() {
    echo "App Tracker Demo Script"
    echo ""
    echo "Usage: $0 [OPTION]"
    echo ""
    echo "Options:"
    echo "  (none)      Start demo with Docker Compose"
    echo "  --dev       Start development environment (requires Node.js, Go)"
    echo "  --prod      Start production-like environment"
    echo "  --stop      Stop all services"
    echo "  --clean     Stop and remove all containers, volumes, and images"
    echo "  --help      Show this help message"
    echo ""
}

# Main
print_banner

case "${1:-}" in
    --dev)
        check_requirements
        start_dev
        ;;
    --prod)
        check_requirements
        start_demo
        ;;
    --stop)
        stop_demo
        ;;
    --clean)
        clean_demo
        ;;
    --help|-h)
        show_help
        ;;
    *)
        check_requirements
        start_demo
        ;;
esac
