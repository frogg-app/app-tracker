#!/bin/bash

# Screenshot Testing Helper Script
# 
# This script helps run screenshot tests for the App Tracker application
# It ensures all prerequisites are met and provides helpful feedback

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
E2E_DIR="$SCRIPT_DIR/../e2e"
UI_DIR="$SCRIPT_DIR/../ui"
SERVER_DIR="$SCRIPT_DIR/../server"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   App Tracker Screenshot Testing${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""

# Check if Playwright is installed
echo -e "${YELLOW}➤${NC} Checking Playwright installation..."
if [ ! -d "$E2E_DIR/node_modules/@playwright" ]; then
    echo -e "${RED}✗${NC} Playwright not installed"
    echo ""
    echo "Installing E2E dependencies..."
    cd "$E2E_DIR"
    npm install
    echo ""
    echo "Installing Playwright browsers..."
    npx playwright install --with-deps
    cd "$SCRIPT_DIR"
else
    echo -e "${GREEN}✓${NC} Playwright is installed"
fi

# Check if application is running
echo -e "${YELLOW}➤${NC} Checking if application is running..."
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Application is running on http://localhost:3000"
    APP_RUNNING=true
else
    echo -e "${YELLOW}⚠${NC} Application is not running on http://localhost:3000"
    APP_RUNNING=false
    
    echo ""
    echo -e "${BLUE}To run the application:${NC}"
    echo "  1. Using Docker Compose:"
    echo "     $ docker compose up -d"
    echo ""
    echo "  2. Or manually:"
    echo "     Terminal 1: cd server && npm start"
    echo "     Terminal 2: cd ui && npm run dev"
    echo ""
    
    read -p "Do you want to continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        echo -e "${RED}Aborted.${NC} Please start the application first."
        exit 1
    fi
fi

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   Running Screenshot Tests${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""

# Create screenshots directory if it doesn't exist
mkdir -p "$E2E_DIR/screenshots"

# Run the tests
cd "$E2E_DIR"

# Check if headed mode is requested
# Temporarily disable set -e to capture exit code and show helpful messages
set +e
if [[ "$1" == "--headed" ]] || [[ "$1" == "-h" ]]; then
    echo -e "${YELLOW}Running in headed mode (you'll see the browser)${NC}"
    echo ""
    npm run test:screenshots:headed
    TEST_EXIT_CODE=$?
else
    echo -e "${YELLOW}Running in headless mode${NC}"
    echo ""
    npm run test:screenshots
    TEST_EXIT_CODE=$?
fi
set -e

echo ""
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}   ✓ Screenshot tests completed successfully!${NC}"
    echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
    echo ""
    echo "Screenshots saved to: $E2E_DIR/screenshots/"
    echo ""
    echo "You can view:"
    echo "  • Mobile screenshots: screenshots/mobile/{light|dark}/"
    echo "  • Tablet screenshots: screenshots/tablet/{light|dark}/"
    echo "  • Desktop screenshots: screenshots/desktop/{light|dark}/"
    echo "  • Flow screenshots: screenshots/mobile-flow/"
    echo "  • Component screenshots: screenshots/components/"
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo "  1. Review the screenshots for layout issues"
    echo "  2. Commit screenshots if they look good"
    echo "  3. Compare with baseline for visual regressions"
else
    echo -e "${RED}════════════════════════════════════════════════════════${NC}"
    echo -e "${RED}   ✗ Screenshot tests failed${NC}"
    echo -e "${RED}════════════════════════════════════════════════════════${NC}"
    echo ""
    echo "Please check the test output above for errors."
    echo ""
    if [ "$APP_RUNNING" = false ]; then
        echo -e "${YELLOW}Note:${NC} The application doesn't seem to be running."
        echo "Make sure to start it before running tests."
    fi
fi

exit $TEST_EXIT_CODE
