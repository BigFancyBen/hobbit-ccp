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

To manually turn the monitor on:
```bash
sudo /usr/local/bin/hdmi-control.sh on
```

When X is running, DPMS is also available:
```bash
DISPLAY=:0 xset dpms force on
```

### Monitor won't turn off in idle mode

The monitor should turn off automatically when exiting gaming mode. To manually turn it off:
```bash
sudo /usr/local/bin/hdmi-control.sh off
```

### App list shows only "Desktop"

The bridge fetches available apps from Sunshine on startup and caches them. If only "Desktop" appears:

1. **Gaming PC not reachable**: Check network connectivity to 192.168.0.69
2. **Moonlight not paired**: See [MOONLIGHT-PAIRING.md](MOONLIGHT-PAIRING.md) for pairing instructions
3. **Bridge just started**: The app list refreshes every 5 minutes. Force a refresh:
   ```bash
   curl -X POST http://localhost:3001/apps/refresh
   ```
4. **Check bridge logs** for errors:
   ```bash
   journalctl -u hobbit-bridge -n 20
   ```

### Qt platform errors when listing apps

The Moonlight AppImage is a Qt app that requires a display. The bridge uses `xvfb-run` to provide a virtual display for headless operation.

If you see errors like "Could not find the Qt platform plugin":
- Ensure `xvfb` package is installed: `sudo apt install xvfb`
- The bridge sets `XDG_RUNTIME_DIR` and `HOME` environment variables automatically

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

### Required ports (UFW from LAN)

| Port | Service | Notes |
|------|---------|-------|
| 22 | SSH | Key-only authentication |
| 53 | DNS | dnsmasq |
| 80 | HTTP | Web UI |
| 443 | HTTPS | Self-signed cert |
| 853 | DNS-over-TLS | Required for Android |
| 5353 | mDNS | avahi-daemon |

Additionally: port 53/udp allowed on `tailscale0` (Split DNS). Ports 80/443 bypass UFW (Docker). MQTT bound to `127.0.0.1`. Bridge API (3001) only reachable via nginx proxy.

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

## Tailscale Issues

### Can't reach hobbit.house remotely

1. Is Tailscale connected on your phone? Check the Tailscale app.
2. Is the subnet route approved? Tailscale admin → Machines → hobbit → routes
3. Is Split DNS configured? Tailscale admin → DNS → `house` → `100.91.142.95`
4. Test with Tailscale IP directly: `curl https://100.91.142.95/ -k`

### HTTPS cert warnings on Tailscale FQDN

Cert may be expired. Renew:
```bash
sudo tailscale cert --cert-file /home/hobbit/hobbit/ssl/tailscale.crt --key-file /home/hobbit/hobbit/ssl/tailscale.key hobbit.tailf803eb.ts.net
docker restart hobbit-webserver-1
```

### Tailscale not connecting

```bash
sudo tailscale up         # Re-authenticate
tailscale status          # Check status
journalctl -u tailscaled  # Check logs
```

See `docs/tailscale.md` for full Tailscale documentation.

## Logs

### View bridge logs
```bash
journalctl -u hobbit-bridge -f
```

### View Docker logs
```bash
docker compose logs -f webserver
docker compose logs -f silverbullet
docker compose logs -f zigbee2mqtt
docker compose logs -f mqtt
```

### View system logs
```bash
journalctl -f
```
