#!/bin/bash
# Unified deploy script for Hobbit Mini PC
# Run from Git Bash on Windows: ./deploy.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== Hobbit Mini PC Deployment ==="
echo ""

# Step 1: Install workspace dependencies
echo "[1/4] Installing dependencies..."
npm install
echo "      Dependencies installed"
echo ""

# Step 2: Build web UI
echo "[2/4] Building Web UI..."
cd web
npm run build
cd ..
echo "      Web UI built successfully"
echo ""

# Step 3: Deploy via Ansible
echo "[3/4] Deploying via Ansible..."
wsl bash -c "cd /mnt/c/Users/Tango/Documents/projects/minipc-setup && \
    ANSIBLE_ROLES_PATH=./roles \
    ANSIBLE_HOST_KEY_CHECKING=False \
    ansible-playbook playbooks/deploy.yml -i inventory.ini"
echo "      Ansible deployment complete"
echo ""

# Step 4: Verify deployment
echo "[4/4] Verifying deployment..."
sleep 5

API_STATUS=$(curl -sf -H "Host: hobbit.local" http://192.168.0.67/api/control/health 2>/dev/null && echo "OK" || echo "FAILED")
WEB_STATUS=$(curl -sf -H "Host: hobbit.local" http://192.168.0.67/ >/dev/null 2>&1 && echo "OK" || echo "FAILED")
HTTPS_STATUS=$(curl -skf -H "Host: hobbit.local" https://192.168.0.67/ >/dev/null 2>&1 && echo "OK" || echo "FAILED")

echo "      Bridge API:  $API_STATUS"
echo "      Web UI:      $WEB_STATUS"
echo "      HTTPS:       $HTTPS_STATUS"
echo ""

if [ "$API_STATUS" = "OK" ] && [ "$WEB_STATUS" = "OK" ]; then
    echo "=== Deployment Successful ==="
else
    echo "=== Deployment completed with warnings ==="
    echo "    Some services may still be starting..."
fi
