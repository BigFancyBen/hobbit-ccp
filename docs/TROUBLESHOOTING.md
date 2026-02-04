# Troubleshooting Guide

Common issues and solutions for the Hobbit Mini PC setup.

## Web UI Issues

### 504 Gateway Timeout on API calls

**Cause**: Nginx container can't reach the bridge service on the host.

**Fix**: Allow Docker network through firewall:
```bash
# Via Ansible
wsl -e bash -c "cd /mnt/c/Users/Tango/Documents/projects/minipc-setup && ansible hobbit -i inventory.ini -m command -a 'ufw allow from 172.16.0.0/12' -e 'ansible_become_password=\"YOUR_PASSWORD\"' -b"

# Or directly on host
ssh hobbit@hobbit.local
sudo ufw allow from 172.16.0.0/12
```

### Web UI loads but buttons don't work

Check the browser console for errors. The API should be accessible at `/api/control/`:
```bash
curl http://hobbit.local/api/control/status
```

### Can't access hobbit.local

1. Check mDNS is running:
   ```bash
   ssh hobbit@192.168.0.67
   systemctl status avahi-daemon
   ```

2. Check your device supports mDNS (most do, Windows may need Bonjour)

3. Use IP directly: `http://192.168.0.67`

### Can't access hobbit.house

The `.house` domain requires DNS configuration:
- Add to your router's local DNS entries, OR
- Add to your device's hosts file

## Docker Issues

### Containers not starting

```bash
ssh hobbit@hobbit.local
cd /home/hobbit/hobbit
docker compose logs
docker compose up -d
```

### Zigbee2MQTT fails (no /dev/ttyUSB0)

The Zigbee dongle isn't connected or detected:
```bash
ls -la /dev/ttyUSB*
```

If missing, plug in the Zigbee coordinator dongle and restart the container.

## Bridge Service Issues

### Bridge not running

```bash
systemctl status hobbit-bridge
sudo systemctl restart hobbit-bridge
journalctl -u hobbit-bridge -f
```

### Bridge can't control Moonlight

Check the bridge.js environment:
```bash
systemctl cat hobbit-bridge | grep GAMING_PC
```

Should show `GAMING_PC_HOST=192.168.0.69`

## Moonlight / Gaming Mode Issues

### Gaming Mode Processes

When gaming mode is active, these processes run:
```
Xorg        - X server on display :0, vt7
openbox     - Window manager for fullscreen handling
moonlight   - Streaming client (AppImage)
```

Check what's running:
```bash
pgrep -a Xorg
pgrep -a openbox
pgrep -a moonlight
```

### Streaming has high latency

1. Use wired ethernet, not WiFi
2. Ensure gaming PC has good encoding (NVIDIA GPU recommended)
3. Lower stream quality in Moonlight settings

### Can't launch gaming mode

Check if X is already running:
```bash
pgrep Xorg
```

If running, kill it first:
```bash
sudo pkill -9 Xorg
sudo pkill -9 moonlight
```

### Stream not filling screen (cropped/small)

The openbox window manager handles fullscreen. If stream is cropped:
1. Ensure xrandr sets correct resolution (1080p)
2. Check openbox is starting before moonlight
3. Verify stream resolution matches display (--1080 flag)

### Monitor stays blank after starting gaming

The monitor may need wake:
```bash
curl -X POST http://localhost:3001/monitor-on
```

Or directly:
```bash
# With X running:
DISPLAY=:0 xset dpms force on

# Without X:
sudo vbetool dpms on
```

### Monitor won't turn off in idle mode

Use vbetool when X isn't running:
```bash
sudo vbetool dpms off
```

Or via API:
```bash
curl -X POST http://localhost:3001/monitor-off
```

## Ansible Issues

### "roles not found"

Always specify inventory explicitly:
```bash
ansible-playbook playbooks/setup.yml -i inventory.ini
```

### synchronize/rsync fails with sudo

Use `copy` module instead. Already fixed in deploy.yml.

### Can't connect to host

1. Check SSH key is copied: `ssh hobbit@192.168.0.67`
2. Verify inventory IP is correct
3. Check firewall allows SSH (port 22)

## Firewall Issues

### Check firewall status

```bash
ssh hobbit@hobbit.local
sudo ufw status
```

### Required ports

| Port | Service |
|------|---------|
| 22 | SSH |
| 80 | HTTP (web UI) |
| 1883 | MQTT |
| 3001 | Bridge API |
| 5353 | mDNS |

### Allow a port

```bash
sudo ufw allow 3001
```

## Logs

### View bridge logs
```bash
journalctl -u hobbit-bridge -f
```

### View Docker logs
```bash
docker compose logs -f webserver
docker compose logs -f zigbee2mqtt
docker compose logs -f mqtt
```

### View system logs
```bash
journalctl -f
```
