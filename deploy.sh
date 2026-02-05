#!/bin/bash
# Unified deploy script for Hobbit Mini PC
# Run from Git Bash on Windows: ./deploy.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== Hobbit Mini PC Deployment ==="
echo ""

# Step 1: Build web UI
echo "[1/3] Building Web UI..."
cd web
npm run build
cd ..
echo "      Web UI built successfully"
echo ""

# Step 2: Deploy via Ansible
echo "[2/3] Deploying via Ansible..."
wsl bash -c "cd /mnt/c/Users/Tango/Documents/projects/minipc-setup && \
    ANSIBLE_ROLES_PATH=./roles \
    ANSIBLE_HOST_KEY_CHECKING=False \
    ansible-playbook playbooks/deploy.yml -i inventory.ini"
echo "      Ansible deployment complete"
echo ""

# Step 3: Verify deployment
echo "[3/3] Verifying deployment..."
sleep 5

API_STATUS=$(curl -sf -H "Host: hobbit.local" http://192.168.0.67/api/control/health 2>/dev/null && echo "OK" || echo "FAILED")
WEB_STATUS=$(curl -sf -H "Host: hobbit.local" http://192.168.0.67/ >/dev/null 2>&1 && echo "OK" || echo "FAILED")
NETDATA_STATUS=$(curl -sf http://192.168.0.67:19999/api/v1/info >/dev/null 2>&1 && echo "OK" || echo "FAILED")

echo "      Bridge API:  $API_STATUS"
echo "      Web UI:      $WEB_STATUS"
echo "      Netdata:     $NETDATA_STATUS"
echo ""

if [ "$API_STATUS" = "OK" ] && [ "$WEB_STATUS" = "OK" ]; then
    echo "=== Deployment Successful ==="
else
    echo "=== Deployment completed with warnings ==="
    echo "    Some services may still be starting..."
fi
