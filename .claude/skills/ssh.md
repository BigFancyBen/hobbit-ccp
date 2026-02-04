# SSH to Hobbit Mini PC

Connect to the Hobbit mini PC via SSH.

## When to Use
Use this skill when the user wants to:
- SSH into the mini PC
- Run commands on the mini PC
- Check services or logs on the mini PC

## Connection Options

### From Windows (via WSL)
```bash
wsl -e ssh hobbit@192.168.0.67
```

### Using hostname (requires DNS/mDNS)
```bash
wsl -e ssh hobbit@hobbit.local
```

## Common Commands Once Connected

### Check service status
```bash
systemctl status hobbit-bridge
systemctl status avahi-daemon
systemctl status dnsmasq
```

### View logs
```bash
journalctl -u hobbit-bridge -f      # Bridge service logs
docker compose logs -f              # Docker container logs
journalctl -f                       # System logs
```

### Docker operations
```bash
cd /home/hobbit/hobbit
docker compose ps                   # List containers
docker compose up -d                # Start containers
docker compose restart              # Restart containers
docker compose logs -f webserver    # Specific container logs
```

### Check gaming mode processes
```bash
pgrep -a Xorg
pgrep -a openbox
pgrep -a moonlight
```

## Network Info
- **Mini PC IP**: 192.168.0.67
- **Gaming PC IP**: 192.168.0.69
- **User**: hobbit
