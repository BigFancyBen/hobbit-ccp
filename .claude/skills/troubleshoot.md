---
name: troubleshoot
description: Diagnose and fix issues with the Hobbit mini PC. Use when web UI not loading, 504 errors, can't connect to hobbit.local, gaming mode fails, Docker containers down, or services not responding.
---

# Quick Diagnostics

SSH in first:
```bash
wsl -e ssh hobbit@192.168.0.67
```

Then check status:
```bash
systemctl status hobbit-bridge
docker compose ps
sudo ufw status
```

# Common Issues

## 504 Gateway Timeout

**Cause**: Nginx can't reach bridge service (firewall blocking Docker network)

**Fix**:
```bash
sudo ufw allow from 172.16.0.0/12
```

## Web UI Loads But Buttons Don't Work

1. Check API directly:
   ```bash
   curl -H "Host: hobbit.local" http://192.168.0.67/api/control/status
   ```
2. Check browser console for errors
3. Verify bridge is running: `systemctl status hobbit-bridge`

## Can't Access hobbit.local

1. Check mDNS: `systemctl status avahi-daemon`
2. Use IP directly: http://192.168.0.67
3. Verify firewall allows port 5353: `sudo ufw status | grep 5353`

## Can't Access hobbit.house

Requires router DNS pointing to hobbit. See `/dns` skill.

## Gaming Mode Won't Start

Kill stuck processes:
```bash
sudo pkill -9 Xorg
sudo pkill -9 moonlight
sudo pkill -9 openbox
```

## Monitor Stays Blank

```bash
curl -X POST http://localhost:3001/monitor-on
```

# Required Firewall Ports

| Port | Service |
|------|---------|
| 22 | SSH |
| 53 | DNS |
| 80 | HTTP |
| 853 | DNS-over-TLS |
| 1883 | MQTT |
| 3001 | Bridge API |
| 5353 | mDNS |

# Quick Fixes

Restart bridge:
```bash
sudo systemctl restart hobbit-bridge
```

Restart Docker:
```bash
cd /home/hobbit/hobbit && docker compose restart
```

Restart DNS:
```bash
sudo systemctl restart dnsmasq
```

# View Logs

```bash
journalctl -u hobbit-bridge -f          # Bridge
docker compose logs -f                   # All containers
sudo dmesg | grep "UFW BLOCK" | tail -10 # Firewall blocks
```
