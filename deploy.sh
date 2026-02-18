#!/bin/bash
# Unified deploy script for Hobbit Mini PC
# Run from Git Bash on Windows: ./deploy.sh [target]
#
# Targets:
#   (none)   Full deploy (default) — install deps, build web, deploy everything
#   web      Build web UI + copy to remote + reload nginx
#   bridge   Copy bridge files + npm install + restart bridge service
#   docker   Sync docker/nginx/mqtt configs + recreate containers

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

TARGET="${1:-full}"

echo "=== Hobbit Mini PC Deployment (target: $TARGET) ==="
echo ""

case "$TARGET" in
  full)
    echo "[1/4] Installing dependencies..."
    npm install
    echo "      Dependencies installed"
    echo ""

    echo "[2/4] Building Web UI..."
    cd web
    npm run build
    cd ..
    echo "      Web UI built successfully"
    echo ""

    echo "[3/4] Deploying via Ansible..."
    wsl bash -c "cd /mnt/c/Users/Tango/Documents/projects/minipc-setup && \
        ANSIBLE_ROLES_PATH=./roles \
        ANSIBLE_HOST_KEY_CHECKING=False \
        ansible-playbook playbooks/deploy.yml -i inventory.ini"
    echo "      Ansible deployment complete"
    echo ""

    echo "[4/4] Verifying deployment..."
    sleep 5

    API_STATUS=$(curl -skf -H "Host: hobbit.local" https://192.168.0.67/api/control/health 2>/dev/null && echo "OK" || echo "FAILED")
    WEB_STATUS=$(curl -skf -H "Host: hobbit.local" https://192.168.0.67/ >/dev/null 2>&1 && echo "OK" || echo "FAILED")
    REDIRECT_STATUS=$(curl -so /dev/null -w '%{http_code}' -H "Host: hobbit.local" http://192.168.0.67/ 2>/dev/null)
    [ "$REDIRECT_STATUS" = "301" ] && HTTPS_REDIRECT="OK" || HTTPS_REDIRECT="FAILED"

    echo "      Bridge API:      $API_STATUS"
    echo "      Web UI (HTTPS):  $WEB_STATUS"
    echo "      HTTP→HTTPS:      $HTTPS_REDIRECT"
    echo ""

    if [ "$API_STATUS" = "OK" ] && [ "$WEB_STATUS" = "OK" ]; then
        echo "=== Deployment Successful ==="
    else
        echo "=== Deployment completed with warnings ==="
        echo "    Some services may still be starting..."
    fi
    ;;

  web)
    echo "[1/3] Installing dependencies..."
    npm install
    echo "      Dependencies installed"
    echo ""

    echo "[2/3] Building Web UI..."
    cd web
    npm run build
    cd ..
    echo "      Web UI built successfully"
    echo ""

    echo "[3/3] Deploying web UI via Ansible..."
    wsl bash -c "cd /mnt/c/Users/Tango/Documents/projects/minipc-setup && \
        ANSIBLE_ROLES_PATH=./roles \
        ANSIBLE_HOST_KEY_CHECKING=False \
        ansible-playbook playbooks/deploy.yml -i inventory.ini --tags web"
    echo "      Web UI deployed"
    echo ""

    echo "=== Web Deploy Complete ==="
    ;;

  bridge)
    echo "[1/2] Deploying bridge via Ansible..."
    wsl bash -c "cd /mnt/c/Users/Tango/Documents/projects/minipc-setup && \
        ANSIBLE_ROLES_PATH=./roles \
        ANSIBLE_HOST_KEY_CHECKING=False \
        ansible-playbook playbooks/deploy.yml -i inventory.ini --tags bridge"
    echo "      Bridge deployed"
    echo ""

    echo "[2/2] Verifying bridge..."
    sleep 3
    API_STATUS=$(curl -skf -H "Host: hobbit.local" https://192.168.0.67/api/control/health 2>/dev/null && echo "OK" || echo "FAILED")
    echo "      Bridge API:  $API_STATUS"
    echo ""

    echo "=== Bridge Deploy Complete ==="
    ;;

  docker)
    echo "[1/1] Deploying docker configs via Ansible..."
    wsl bash -c "cd /mnt/c/Users/Tango/Documents/projects/minipc-setup && \
        ANSIBLE_ROLES_PATH=./roles \
        ANSIBLE_HOST_KEY_CHECKING=False \
        ansible-playbook playbooks/deploy.yml -i inventory.ini --tags docker"
    echo "      Docker configs deployed"
    echo ""

    echo "=== Docker Deploy Complete ==="
    ;;

  *)
    echo "Unknown target: $TARGET"
    echo "Usage: ./deploy.sh [web|bridge|docker]"
    echo "  (no argument = full deploy)"
    exit 1
    ;;
esac
