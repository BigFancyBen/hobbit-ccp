---
name: ssh
description: Connect to the Hobbit mini PC via SSH. Use when running commands, checking logs, viewing service status, managing Docker containers, or debugging issues on the server.
---

# Connect

From Windows (via WSL):
```bash
wsl -e ssh hobbit@192.168.0.67
```

Or using hostname (requires mDNS):
```bash
wsl -e ssh hobbit@hobbit.local
```

# Common Commands

## Service Status

```bash
systemctl status hobbit-bridge       # Bridge API
systemctl status avahi-daemon        # mDNS
systemctl status dnsmasq             # DNS server
systemctl status hobbit-backup.timer # Backup timer
```

## View Logs

```bash
journalctl -u hobbit-bridge -f       # Bridge service
docker compose logs -f               # All containers
docker compose logs -f webserver     # Nginx container
journalctl -f                        # System logs
```

## Docker Operations

```bash
cd /home/hobbit/hobbit
docker compose ps                    # List containers
docker compose up -d                 # Start containers
docker compose restart               # Restart all
```

## Gaming Mode Processes

```bash
pgrep -a Xorg
pgrep -a openbox
pgrep -a moonlight
```

## Manual Backup

```bash
sudo /usr/local/bin/backup.sh
ls -lh /home/hobbit/backups/
```

# Network Info

| Host | IP |
|------|-----|
| Mini PC | 192.168.0.67 |
| Gaming PC | 192.168.0.69 |
| User | hobbit |
