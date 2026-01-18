#!/bin/bash
# Generate seed data for App Tracker demo
# This script populates the database with sample data

set -e

API_URL="${API_URL:-http://localhost:32400}"

echo "Seeding App Tracker demo data..."

# Wait for server to be ready
echo "Waiting for server..."
until curl -s "${API_URL}/health" > /dev/null 2>&1; do
    sleep 1
done

echo "Server is ready!"

# Login and get token
echo "Logging in..."
TOKEN=$(curl -s -X POST "${API_URL}/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"admin123"}' | \
    grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "Failed to get authentication token"
    exit 1
fi

echo "Authenticated successfully"

# Create additional users
echo "Creating users..."

curl -s -X POST "${API_URL}/api/users" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${TOKEN}" \
    -d '{
        "username": "operator",
        "password": "operator123",
        "role": "operator"
    }' > /dev/null

curl -s -X POST "${API_URL}/api/users" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${TOKEN}" \
    -d '{
        "username": "viewer",
        "password": "viewer123",
        "role": "viewer"
    }' > /dev/null

echo "✓ Users created"

# Generate API tokens
echo "Creating API tokens..."

curl -s -X POST "${API_URL}/api/tokens" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${TOKEN}" \
    -d '{
        "name": "CI/CD Pipeline",
        "expiresIn": "30d"
    }' > /dev/null

curl -s -X POST "${API_URL}/api/tokens" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${TOKEN}" \
    -d '{
        "name": "Monitoring Integration",
        "expiresIn": "90d"
    }' > /dev/null

echo "✓ API tokens created"

echo ""
echo "Seed data generation complete!"
echo ""
echo "Available users:"
echo "  admin    / admin123    (admin role)"
echo "  operator / operator123 (operator role)"
echo "  viewer   / viewer123   (viewer role)"
echo ""
