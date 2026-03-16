#!/bin/bash
# Unified deploy script for Hobbit Mini PC
# Run from Git Bash on Windows: ./deploy.sh [target]
#
# Targets:
#   (none)   Full deploy (default) — sync, build on server, deploy everything
#   web      Sync source + build on server + reload nginx
#   bridge   Copy bridge files + npm install + restart bridge service
#   docker   Sync docker/nginx/mqtt configs + recreate containers
#   kodi     Install Kodi + VA-API + configure JSON-RPC
#   nas      Install Samba + configure LAN file sharing
#   audio    Fix PulseAudio stereo output

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

TARGET="${1:-full}"

echo "=== Hobbit Mini PC Deployment (target: $TARGET) ==="
echo ""

case "$TARGET" in
  full)
    echo "[1/2] Deploying via Ansible..."
    wsl bash -c "cd /mnt/c/Users/Tango/Documents/projects/minipc-setup && \
        ANSIBLE_CONFIG=./ansible.cfg \
        ansible-playbook playbooks/deploy.yml"
    echo "      Ansible deployment complete"
    echo ""

    echo "[2/2] Verifying deployment..."
    sleep 5

    API_STATUS=$(curl -skf -H "Host: hobbit.local" https://192.168.0.67/api/control/health 2>/dev/null && echo "OK" || echo "FAILED")
    WEB_STATUS=$(curl -skf -H "Host: hobbit.local" https://192.168.0.67/ >/dev/null 2>&1 && echo "OK" || echo "FAILED")
    echo "      Bridge API:      $API_STATUS"
    echo "      Web UI (HTTPS):  $WEB_STATUS"
    echo ""

    if [ "$API_STATUS" = "OK" ] && [ "$WEB_STATUS" = "OK" ]; then
        echo "=== Deployment Successful ==="
    else
        echo "=== Deployment completed with warnings ==="
        echo "    Some services may still be starting..."
    fi
    ;;

  web)
    echo "[1/1] Deploying web UI via Ansible..."
    wsl bash -c "cd /mnt/c/Users/Tango/Documents/projects/minipc-setup && \
        ANSIBLE_CONFIG=./ansible.cfg \
        ansible-playbook playbooks/deploy.yml --tags web"
    echo "      Web UI deployed"
    echo ""

    echo "=== Web Deploy Complete ==="
    ;;

  bridge)
    echo "[1/2] Deploying bridge via Ansible..."
    wsl bash -c "cd /mnt/c/Users/Tango/Documents/projects/minipc-setup && \
        ANSIBLE_CONFIG=./ansible.cfg \
        ansible-playbook playbooks/deploy.yml --tags bridge"
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
        ANSIBLE_CONFIG=./ansible.cfg \
        ansible-playbook playbooks/deploy.yml --tags docker"
    echo "      Docker configs deployed"
    echo ""

    echo "=== Docker Deploy Complete ==="
    ;;

  kodi)
    echo "[1/1] Installing Kodi via Ansible..."
    wsl bash -c "cd /mnt/c/Users/Tango/Documents/projects/minipc-setup && \
        ANSIBLE_CONFIG=./ansible.cfg \
        ansible-playbook playbooks/deploy.yml --tags kodi"
    echo "      Kodi installed and configured"
    echo ""

    echo "=== Kodi Deploy Complete ==="
    ;;

  nas)
    echo "[1/1] Deploying NAS (Samba) via Ansible..."
    wsl bash -c "cd /mnt/c/Users/Tango/Documents/projects/minipc-setup && \
        ANSIBLE_CONFIG=./ansible.cfg \
        ansible-playbook playbooks/deploy.yml --tags nas"
    echo "      NAS deployed"
    echo ""

    echo "=== NAS Deploy Complete ==="
    echo "NOTE: Set Samba password for hobbit user:"
    echo "  ssh hobbit@192.168.0.67 'sudo smbpasswd -a hobbit'"
    ;;

  audio)
    echo "[1/1] Fixing PulseAudio stereo output..."
    wsl bash -c "cd /mnt/c/Users/Tango/Documents/projects/minipc-setup && \
        ANSIBLE_CONFIG=./ansible.cfg \
        ansible-playbook playbooks/deploy.yml --tags audio"
    echo "      Audio configured for stereo"
    echo ""

    echo "=== Audio Deploy Complete ==="
    ;;

  *)
    echo "Unknown target: $TARGET"
    echo "Usage: ./deploy.sh [web|bridge|docker|kodi|nas|audio]"
    echo "  (no argument = full deploy)"
    exit 1
    ;;
esac
