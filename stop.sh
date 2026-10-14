#!/usr/bin/env bash
# ==============================================================================
# vaultOne Banking Platform — Stop All Local Services (macOS / Linux)
# ==============================================================================

echo "Stopping vaultOne Banking Platform services..."

# Stop Frontend
pkill -f "ng serve" 2>/dev/null || true
echo "  ✔ Stopped Angular frontend (port 4200)"

# Stop Backend 1
pkill -f "AUTHMODULET1" 2>/dev/null || pkill -f "auth-0.0.1" 2>/dev/null || true
echo "  ✔ Stopped Auth microservice (port 8080)"

# Stop Backend 2
pkill -f "FDMODULET2" 2>/dev/null || pkill -f "demo-0.0.1" 2>/dev/null || true
echo "  ✔ Stopped Fixed Deposit microservice (port 8081)"

echo "All services stopped successfully."
