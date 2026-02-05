---
name: gaming
description: Manage Moonlight game streaming on the Hobbit mini PC. Use when pairing with Sunshine, starting/stopping gaming mode, troubleshooting streams, or controlling the monitor via DDC/CI.
---

# Architecture

- **Moonlight**: Streaming client on mini PC (AppImage)
- **Sunshine**: Streaming server on gaming PC (192.168.0.69)
- **Bridge**: Node.js API controlling Moonlight

# Initial Pairing (One-Time)

1. SSH in:
   ```bash
   wsl -e ssh hobbit@192.168.0.67
   ```

2. Start Moonlight with X server:
   ```bash
   sudo xinit moonlight -- :0 vt7
   ```

3. On mini PC monitor:
   - Add gaming PC IP: `192.168.0.69`
   - Click to pair, note the 4-digit PIN

4. On gaming PC:
   - Open Sunshine: https://localhost:47990
   - Enter PIN to approve

5. Exit: `Ctrl+Q` or `sudo pkill Xorg`

# Verify Pairing

```bash
moonlight list 192.168.0.69
# Shows: Steam Big Picture, Desktop, etc.
```

# API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/control/status` | GET | Current mode (gaming/idle) |
| `/api/control/apps` | GET | List available games |
| `/api/control/launch-moonlight?app=Desktop` | POST | Start streaming |
| `/api/control/exit-gaming` | POST | Stop streaming |
| `/api/control/monitor-on` | POST | Turn monitor on (DDC/CI) |
| `/api/control/monitor-off` | POST | Turn monitor off (DDC/CI) |

# Gaming Mode Components

When active:
- `Xorg` - X server on display :0, vt7
- `openbox` - Window manager (fullscreen)
- `moonlight` - Streaming at 1920x1080 @ 60fps

# Troubleshooting

**Can't launch gaming mode**
```bash
sudo pkill -9 Xorg
sudo pkill -9 moonlight
sudo pkill -9 openbox
```

**Monitor stays blank**
```bash
curl -X POST http://localhost:3001/monitor-on
# Or: sudo ddcutil setvcp 0xD6 0x01
```

**Stream not filling screen**
1. Check xrandr sets 1080p
2. Verify openbox starts before moonlight
3. Confirm --1080 flag in settings

**High latency**
1. Use wired ethernet
2. Check GPU encoding on gaming PC
3. Lower stream quality

**Check running processes**
```bash
pgrep -a Xorg
pgrep -a openbox
pgrep -a moonlight
```
