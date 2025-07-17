#!/bin/bash

# Test script to reproduce Redocly CLI offline performance issue
# This script blocks network access and tests Redocly CLI performance

set -e

echo "🧪 Redocly CLI Offline Performance Test"
echo "======================================"

# Create test directory
TEST_DIR="/tmp/redocly-offline-test"
mkdir -p "$TEST_DIR"
cd "$TEST_DIR"

# Create test OpenAPI specification
cat > test-api.yaml << 'EOF'
openapi: 3.0.0
info:
  title: Test API
  version: 1.0.0
  description: Test API for Redocly CLI performance testing
servers:
  - url: https://api.example.com/v1
paths:
  /users:
    get:
      summary: Get users
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                type: array
                items:
                  type: object
                  properties:
                    id:
                      type: integer
                    name:
                      type: string
                    email:
                      type: string
  /users/{id}:
    get:
      summary: Get user by ID
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                type: object
                properties:
                  id:
                    type: integer
                  name:
                    type: string
                  email:
                    type: string
        '404':
          description: User not found
EOF

# Create Redocly config with telemetry enabled
cat > redocly.yaml << 'EOF'
apis:
  test-api@v1:
    root: ./test-api.yaml
# telemetry: 'off'  # Commented out to enable telemetry and reproduce the issue
EOF

echo "📋 Test files created:"
echo "  - test-api.yaml (OpenAPI spec)"
echo "  - redocly.yaml (Redocly config with telemetry enabled)"
echo ""

# Function to run a test and measure time
run_test() {
    local test_name="$1"
    local command="$2"
    local env_vars="$3"
    
    echo ""
    echo "📊 Running: $test_name"
    echo "Command: $command"
    if [ -n "$env_vars" ]; then
        echo "Environment: $env_vars"
    fi
    
    # Run the command and measure time
    start_time=$(date +%s.%N)
    
    if [ -n "$env_vars" ]; then
        eval "$env_vars $command" 2>&1 || true
    else
        eval "$command" 2>&1 || true
    fi
    
    end_time=$(date +%s.%N)
    duration=$(echo "$end_time - $start_time" | bc -l)
    
    echo "⏱️  Duration: ${duration}s"
    echo "✅ Test completed"
}

# Check if Redocly CLI is installed
if ! command -v redocly &> /dev/null; then
    echo "❌ Redocly CLI not found. Installing..."
    npm install -g @redocly/cli@2.0.0-next.4
fi

echo "🔍 Redocly CLI Version:"
redocly --version

echo ""
echo "🌐 Testing network connectivity:"
if ping -c 1 8.8.8.8 > /dev/null 2>&1; then
    echo "✅ Network is accessible"
    NETWORK_ACCESSIBLE=true
else
    echo "❌ Network is blocked"
    NETWORK_ACCESSIBLE=false
fi

echo ""
echo "🧪 Running tests..."

# Test 1: Bundle command (should hang if network calls are made)
run_test "Bundle (telemetry enabled)" "redocly bundle test-api.yaml --output bundled-api.yaml"

# Test 2: Lint command (should hang if network calls are made)
run_test "Lint (telemetry enabled)" "redocly lint test-api.yaml"

# Test 3: Bundle command with explicit offline flag
run_test "Bundle (REDOCLY_OFFLINE=true)" "redocly bundle test-api.yaml --output bundled-api-offline.yaml" "REDOCLY_OFFLINE=true"

# Test 4: Lint command with explicit offline flag
run_test "Lint (REDOCLY_OFFLINE=true)" "redocly lint test-api.yaml" "REDOCLY_OFFLINE=true"

echo ""
echo "📋 Test Summary:"
echo "================="
echo "Expected behavior:"
echo "- If network is accessible: All tests should complete in <5 seconds"
echo "- If network is blocked: Tests 1-2 should hang (>60 seconds), Tests 3-4 should be fast (<5 seconds)"
echo ""
echo "🎯 Performance targets:"
echo "- Online environment: <5 seconds per operation"
echo "- Offline environment with detection: <5 seconds per operation"
echo "- Offline environment without detection: >60 seconds per operation"

# Cleanup
echo ""
echo "🧹 Cleaning up..."
rm -rf "$TEST_DIR"
echo "✅ Test completed!" 