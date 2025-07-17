#!/bin/bash

set -e

echo "🚀 Setting up Redocly CLI offline testing environment..."

# Create namespace
echo "📦 Creating namespace..."
kubectl apply -f namespace.yaml

# Deploy test pod
echo "🐳 Deploying test pod..."
kubectl apply -f test-pod.yaml

# Wait for pod to be ready
echo "⏳ Waiting for pod to be ready..."
kubectl wait --for=condition=Ready pod/redocly-cli-test-pod -n redocly-cli-test --timeout=300s

echo ""
echo "✅ Test environment deployed!"
echo ""
echo "🔍 To view test logs:"
echo "   kubectl logs -f redocly-cli-test-pod -n redocly-cli-test"
echo ""
echo "🔧 To access the pod shell:"
echo "   kubectl exec -it redocly-cli-test-pod -n redocly-cli-test -- /bin/sh"
echo ""
echo "🧪 To run offline tests (block network):"
echo "   kubectl apply -f network-policy.yaml"
echo ""
echo "🌐 To run online tests (allow network):"
echo "   kubectl apply -f network-policy-allow.yaml"
echo ""
echo "🗑️  To clean up:"
echo "   kubectl delete namespace redocly-cli-test" 