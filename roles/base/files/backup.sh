#!/bin/bash
# Hobbit Mini PC Backup Script
# Runs weekly via systemd timer

set -e

BACKUP_DIR="/home/hobbit/backups"
DATE=$(date +%Y-%m-%d)
BACKUP_FILE="$BACKUP_DIR/hobbit-$DATE.tar.gz"

echo "Starting backup at $(date)"

mkdir -p "$BACKUP_DIR"

# Stop containers for consistent backup
echo "Stopping containers..."
cd /home/hobbit/hobbit && docker compose stop

# Backup all config and data
echo "Creating backup archive..."
tar -czf "$BACKUP_FILE" \
    /home/hobbit/hobbit \
    /etc/dnsmasq.d \
    /etc/ssh/sshd_config.d \
    2>/dev/null || true

# Restart containers
echo "Restarting containers..."
cd /home/hobbit/hobbit && docker compose up -d

# Keep only last 7 local backups
echo "Cleaning old backups..."
find "$BACKUP_DIR" -name "hobbit-*.tar.gz" -mtime +7 -delete

echo "Backup complete: $BACKUP_FILE"
ls -lh "$BACKUP_FILE"
echo "Finished at $(date)"
