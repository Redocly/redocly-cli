#!/bin/bash

# Test script for Redocly CLI offline performance testing
# This script should be run inside the Kubernetes pod

set -e

echo "🧪 Redocly CLI Offline Performance Test"
echo "======================================"

# Function to run a test and measure time
run_test() {
    local test_name="$1"
    local command="$2"
    
    echo ""
    echo "📊 Running: $test_name"
    echo "Command: $command"
    
    # Run the command and measure time
    start_time=$(date +%s.%N)
    
    eval "$command"
    
    end_time=$(date +%s.%N)
    duration=$(echo "$end_time - $start_time" | bc -l)
    
    echo "⏱️  Duration: ${duration}s"
    echo "✅ Test completed"
}

# Function to check network connectivity
check_network() {
    if ping -c 1 8.8.8.8 > /dev/null 2>&1; then
        echo "✅ Network is accessible"
        return 0
    else
        echo "❌ Network is blocked"
        return 1
    fi
}

# Install iptables if not available
echo "🔧 Installing iptables..."
if ! command -v iptables &> /dev/null; then
    if command -v apt-get &> /dev/null; then
        apt-get update && apt-get install -y iptables
    elif command -v yum &> /dev/null; then
        yum install -y iptables
    elif command -v apk &> /dev/null; then
        apk add iptables
    else
        echo "❌ Could not install iptables - package manager not found"
        exit 1
    fi
fi

# Check Redocly CLI version
echo "🔍 Redocly CLI Version:"
redocly --version

echo ""
echo "🌐 Initial network connectivity test:"
check_network

# Phase 1: Tests with network access (should be fast)
echo ""
echo "📡 PHASE 1: Testing with network access"
echo "======================================"

# Test 1: Bundle command with network access
run_test "Bundle (with network)" "redocly bundle test-api.yaml --output bundled-api-online.yaml"

# Test 2: Lint command with network access
run_test "Lint (with network)" "redocly lint test-api.yaml"

# Phase 2: Disable network connectivity
echo ""
echo "🚫 PHASE 2: Disabling network connectivity"
echo "========================================="

echo "🔒 Blocking outgoing connections (except DNS)..."
iptables -A OUTPUT -p udp --dport 53 -j ACCEPT
iptables -A OUTPUT -j DROP

echo "🌐 Network connectivity test after blocking:"
check_network

# Phase 3: Tests without network access (should be slow due to timeouts)
echo ""
echo "📡 PHASE 3: Testing without network access"
echo "========================================="

# Test 3: Bundle command without network (should be slow)
run_test "Bundle (no network)" "redocly bundle test-api.yaml --output bundled-api-offline.yaml"

# Test 4: Lint command without network (should be slow)
run_test "Lint (no network)" "redocly lint test-api.yaml"

# Phase 4: Restore network connectivity
echo ""
echo "🔓 PHASE 4: Restoring network connectivity"
echo "========================================="

echo "🔓 Restoring outgoing connections..."
iptables -F OUTPUT

echo "🌐 Network connectivity test after restoration:"
check_network

# Phase 5: Final tests with restored network (should be fast again)
echo ""
echo "📡 PHASE 5: Testing with restored network access"
echo "=============================================="

# Test 5: Bundle command with restored network
run_test "Bundle (restored network)" "redocly bundle test-api.yaml --output bundled-api-restored.yaml"

# Test 6: Lint command with restored network
run_test "Lint (restored network)" "redocly lint test-api.yaml"

echo ""
echo "📋 Test Summary:"
echo "================="
echo "Expected behavior:"
echo "- Phase 1 (with network): Should be fast (<5 seconds per operation)"
echo "- Phase 3 (no network): Should be slow (>60 seconds per operation) due to network timeouts"
echo "- Phase 5 (restored network): Should be fast again (<5 seconds per operation)"
echo ""
echo "🎯 Performance targets:"
echo "- Online environment: <5 seconds per operation"
echo "- Offline environment: >60 seconds per operation (due to timeouts)"
echo ""
echo "🧹 Cleaning up..."
echo "Test completed successfully!" 