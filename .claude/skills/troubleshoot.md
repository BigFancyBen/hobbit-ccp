# Troubleshoot Hobbit Mini PC

Diagnose and fix common issues with the Hobbit mini PC setup.

## When to Use
Use this skill when the user reports:
- Web UI not loading or buttons not working
- Can't connect to hobbit.local or hobbit.house
- Gaming mode not starting or streaming issues
- Docker containers not running
- 504 Gateway Timeout errors

## Diagnostic Steps

### 1. Web UI Issues

**504 Gateway Timeout on API calls**
- Cause: Nginx container can't reach bridge service
- Fix: Allow Docker network through firewall:
  ```bash
  wsl -e bash -c "cd /mnt/c/Users/Tango/Documents/projects/minipc-setup && ansible hobbit -i inventory.ini -m command -a 'ufw allow from 172.16.0.0/12' -e 'ansible_become_password=\"PASSWORD\"' -b"
  ```

**Web UI loads but buttons don't work**
- Check API: `curl http://hobbit.local/api/control/status`
- Check browser console for errors

### 2. Hostname Resolution

**Can't access hobbit.local**
1. Check mDNS: `systemctl status avahi-daemon`
2. Use IP directly: http://192.168.0.67

**Can't access hobbit.house**
- Requires DNS configuration (router DNS pointing to hobbit)
- See /dns skill for setup

### 3. Service Status Checks

```bash
# SSH in first
wsl -e ssh hobbit@192.168.0.67

# Check key services
systemctl status hobbit-bridge
systemctl status avahi-daemon
systemctl status dnsmasq

# Check Docker
cd /home/hobbit/hobbit
docker compose ps
docker compose logs
```

### 4. Gaming Mode Issues

**Can't launch gaming mode**
```bash
# Kill stuck processes
sudo pkill -9 Xorg
sudo pkill -9 moonlight
```

**Monitor stays blank**
```bash
curl -X POST http://localhost:3001/monitor-on
# Or directly: sudo vbetool dpms on
```

### 5. Firewall Check

```bash
sudo ufw status
```

Required ports: 22 (SSH), 80 (HTTP), 1883 (MQTT), 3001 (Bridge), 5353 (mDNS), 53 (DNS)

### 6. View Logs

```bash
# Bridge service
journalctl -u hobbit-bridge -f

# Docker containers
docker compose logs -f webserver
docker compose logs -f zigbee2mqtt

# System
journalctl -f
```

## Quick Fixes

**Restart bridge service**
```bash
sudo systemctl restart hobbit-bridge
```

**Restart Docker containers**
```bash
cd /home/hobbit/hobbit && docker compose restart
```

**Restart dnsmasq**
```bash
sudo systemctl restart dnsmasq
```
