# Gaming Mode / Moonlight

Manage Moonlight game streaming and gaming mode on the Hobbit mini PC.

## When to Use
Use this skill when the user wants to:
- Pair Moonlight with Sunshine
- Start or stop gaming mode
- Troubleshoot streaming issues
- Control the monitor

## Architecture

- **Moonlight**: Game streaming client on mini PC (AppImage)
- **Sunshine**: Game streaming server on gaming PC (192.168.0.69:47989)
- **Bridge**: Node.js service that controls Moonlight via API

## Initial Pairing (One-Time)

1. SSH into the mini PC:
   ```bash
   wsl -e ssh hobbit@192.168.0.67
   ```

2. Start Moonlight with X server on physical display:
   ```bash
   sudo xinit moonlight -- :0 vt7
   ```

3. On mini PC monitor:
   - Add gaming PC IP if needed: `192.168.0.69`
   - Click to start pairing
   - Note the 4-digit PIN shown

4. On gaming PC:
   - Open Sunshine web UI: https://localhost:47990
   - Enter the PIN to approve pairing

5. Exit Moonlight: Press `Ctrl+Q` or run `sudo pkill Xorg`

## Verify Pairing

```bash
moonlight list 192.168.0.69
# Should show: Steam Big Picture, Desktop, etc.
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/control/status` | GET | Current status (gaming/idle) |
| `/api/control/apps` | GET | List available games |
| `/api/control/launch-moonlight?app=Desktop` | POST | Start streaming |
| `/api/control/exit-gaming` | POST | Stop streaming |
| `/api/control/monitor-on` | POST | Turn monitor on |
| `/api/control/monitor-off` | POST | Turn monitor off |

## Gaming Mode Components

When gaming mode is active:
- `Xorg` - X server on display :0, vt7
- `openbox` - Window manager for fullscreen
- `moonlight` - Streaming client

Stream settings: 1920x1080 @ 60fps

## Troubleshooting

**Can't launch gaming mode**
```bash
# Kill stuck processes
sudo pkill -9 Xorg
sudo pkill -9 moonlight
```

**Monitor stays blank**
```bash
curl -X POST http://localhost:3001/monitor-on
# Or: sudo vbetool dpms on
```

**Stream not filling screen**
1. Check xrandr sets 1080p resolution
2. Verify openbox starts before moonlight
3. Confirm --1080 flag in stream settings

**High latency**
1. Use wired ethernet, not WiFi
2. Ensure gaming PC has good GPU encoding
3. Lower stream quality

**Check what's running**
```bash
pgrep -a Xorg
pgrep -a openbox
pgrep -a moonlight
```
