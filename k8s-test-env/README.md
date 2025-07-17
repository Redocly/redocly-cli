# Redocly CLI Offline Performance Testing Environment

This Kubernetes environment is designed to reproduce and test the performance issues where Redocly CLI becomes extremely slow (>1 minute) in offline environments.

## Test Environment Setup

### Prerequisites

- Kubernetes cluster (local or remote)
- `kubectl` configured to access the cluster
- NetworkPolicy support enabled (for network blocking)
- `test-api.yaml`

### Quick Start

1. **Deploy the test environment:**

   ```bash
   chmod +x deploy.sh
   ./deploy.sh
   ```

2. **Run offline tests (block network):**

   ```bash
   kubectl apply -f network-policy.yaml
   ```

3. **View test results:**

   ```bash
   kubectl logs -f redocly-cli-test-pod -n redocly-cli-test
   ```

4. **Run online tests (allow network):**
   ```bash
   kubectl apply -f network-policy-allow.yaml
   ```

## Test Scenarios

### Scenario 1: Offline Environment (Network Blocked)

- **Expected behavior without fix:** operations take >60 seconds
- **Expected behavior with fix:** operations take <5 seconds
- **NetworkPolicy:** `network-policy.yaml` (blocks outbound traffic)

### Scenario 2: Online Environment (Network Allowed)

- **Expected behavior:** operations take <5 seconds
- **NetworkPolicy:** `network-policy-allow.yaml` (allows all traffic)

### Scenario 3: Explicit Offline Mode

- **Environment variables:** `REDOCLY_OFFLINE=true`
- **Expected behavior:** operations take <5 seconds regardless of network status

### Scenario 4: CI Environment

- **Environment variables:** `CI=true REDOCLY_NO_NETWORK=true`
- **Expected behavior:** operations take <5 seconds regardless of network status

## Test Commands

The test pod automatically runs these commands:

1. **Bundle command:**

   ```bash
   redocly bundle test-api.yaml --output bundled-api.yaml
   ```

2. **Lint command:**

   ```bash
   redocly lint test-api.yaml
   ```

3. **With offline detection:**
   ```bash
   REDOCLY_OFFLINE=true redocly bundle test-api.yaml --output bundled-api-offline.yaml
   ```

## Manual Testing

To run tests manually inside the pod:

```bash
# Access the pod
kubectl exec -it redocly-cli-test-pod -n redocly-cli-test -- /bin/sh

# Copy and run the test script
cp /config/test-script.sh /workspace/
chmod +x test-script.sh
sh test-script.sh
```

## Troubleshooting

### Pod won't start

```bash
# Check pod status
kubectl get pods -n redocly-cli-test

# Check pod events
kubectl describe pod redocly-cli-test-pod -n redocly-cli-test
```

### Network policies not working

```bash
# Check if NetworkPolicy is supported
kubectl get crd networkpolicies.networking.k8s.io

# Check NetworkPolicy status
kubectl get networkpolicy -n redocly-cli-test
```

### Test results unclear

```bash
# Get detailed logs
kubectl logs redocly-cli-test-pod -n redocly-cli-test --previous

# Check network connectivity from pod
kubectl exec redocly-cli-test-pod -n redocly-cli-test -- ping -c 1 8.8.8.8
```

## Cleanup

```bash
# Remove the entire test namespace
kubectl delete namespace redocly-cli-test
```

## Files Description

- `namespace.yaml` - Kubernetes namespace for isolation
- `test-pod.yaml` - pod with the local Redocly CLI build
- `network-policy.yaml` - blocks outbound traffic (offline simulation)
- `network-policy-allow.yaml` - allows all traffic (online simulation)
- `deploy.sh` - deployment script
- `test-script.sh` - manual test script
- `README.md` - this documentation

## Expected Results

A command (e. g., `lint`) should not take longer than 5-10 seconds either in online or offline environments.
