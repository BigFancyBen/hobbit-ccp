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

The monitor is controlled via DDC/CI (ddcutil). To manually turn it on:
```bash
sudo ddcutil setvcp d6 1
```

Or use the control script:
```bash
sudo /usr/local/bin/hdmi-control.sh on
```

### Monitor won't turn off in idle mode

The monitor should turn off automatically when exiting gaming mode. To manually turn it off:
```bash
sudo ddcutil setvcp d6 5
```

Or use the control script:
```bash
sudo /usr/local/bin/hdmi-control.sh off
```

### Monitor control not working

If ddcutil fails, check DDC/CI support:
```bash
sudo ddcutil detect
sudo ddcutil getvcp d6
```

Ensure the i2c-dev module is loaded:
```bash
sudo modprobe i2c-dev
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

| Port | Service | Notes |
|------|---------|-------|
| 22 | SSH | Key-only authentication |
| 53 | DNS | dnsmasq |
| 80 | HTTP | Web UI |
| 853 | DNS-over-TLS | Required for Android |
| 1883 | MQTT | Mosquitto broker |
| 3001 | Bridge API | Moonlight/monitor control |
| 5353 | mDNS | avahi-daemon |
| 19999 | Netdata | System monitoring |

### Android shows "Connected, no internet"

Android uses DNS-over-TLS (port 853) by default. If this port is blocked, Android reports no internet even though regular DNS works.

**Fix**: Ensure port 853 is allowed in firewall:
```bash
sudo ufw allow from 192.168.0.0/24 to any port 853
```

### Check for blocked connections

```bash
sudo dmesg | grep "UFW BLOCK" | tail -20
```

This shows recent firewall blocks with source IP and port - useful for debugging.

### Allow a port (LAN only)

```bash
sudo ufw allow from 192.168.0.0/24 to any port 3001
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
