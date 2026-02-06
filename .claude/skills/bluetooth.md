---
name: bluetooth
description: Manage Bluetooth controllers on the Hobbit mini PC. Use for pairing game controllers, troubleshooting connection issues, or adding new Bluetooth functionality.
---

# Bluetooth Controller Management

Bluetooth controllers connect to the Hobbit mini PC and input is passed through Moonlight to the gaming PC. See `docs/bluetooth.md` for full documentation.

## Architecture

```
Controller → Bluetooth → Hobbit (evdev) → Moonlight → Sunshine → Game
```

- Controller pairs via `bluetoothctl`
- Linux exposes as `/dev/input/event*`
- Moonlight reads input and sends to Sunshine
- Sunshine emulates Xbox 360 controller

## Required Groups

The `hobbit` user must be in these groups:
- `bluetooth` - Access to bluetoothctl
- `input` - Access to /dev/input/event*

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/control/bluetooth/status` | GET | List paired devices with connection status |
| `/api/control/bluetooth/scan` | POST | Start/stop device discovery |
| `/api/control/bluetooth/discovered` | GET | Devices found during scan |
| `/api/control/bluetooth/pair` | POST | Pair with a device |
| `/api/control/bluetooth/connect` | POST | Connect to paired device |
| `/api/control/bluetooth/disconnect` | POST | Disconnect device |
| `/api/control/bluetooth/device/:mac` | DELETE | Remove paired device |

## Common Commands

```bash
# Check Bluetooth adapter
bluetoothctl show

# List paired devices
bluetoothctl devices Paired

# Check device info
bluetoothctl info XX:XX:XX:XX:XX:XX

# Manual pairing
bluetoothctl
> power on
> agent on
> default-agent
> scan on
# Put controller in pairing mode, wait for it to appear
> pair XX:XX:XX:XX:XX:XX
> trust XX:XX:XX:XX:XX:XX
> connect XX:XX:XX:XX:XX:XX
> quit

# Verify controller is visible to system
ls -la /dev/input/by-id/ | grep -i controller
cat /dev/input/by-id/*controller*-event-joystick  # Press buttons to test
```

## Controller Pairing Modes

| Controller | Pairing Mode |
|------------|--------------|
| Xbox One/Series | Hold Xbox button + Sync button (top) |
| PS4/PS5 | Hold Share + PS button until light flashes |
| 8BitDo | Hold Start + Pair button |
| Switch Pro | Hold Sync button (top) |

## Troubleshooting

**Controller not detected during scan**
```bash
# Check Bluetooth adapter is powered
bluetoothctl show | grep Powered

# Restart Bluetooth service
sudo systemctl restart bluetooth
```

**Controller paired but no input**
```bash
# Check hobbit is in input group
groups hobbit

# Check device exists
ls /dev/input/by-id/

# Reboot may be needed after group change
sudo reboot
```

**Controller disconnects frequently**
```bash
# Trust the device for auto-reconnect
bluetoothctl trust XX:XX:XX:XX:XX:XX

# Check for interference (2.4GHz WiFi)
# Move controller closer during pairing
```

**Check bridge logs**
```bash
ssh hobbit "journalctl -u hobbit-bridge -f"
```

## Files

| File | Purpose |
|------|---------|
| `files/bridge.js` | Bluetooth API endpoints (lines 296-450) |
| `web/src/hooks/useBluetooth.ts` | React hook for Bluetooth state |
| `web/src/components/BluetoothSection.tsx` | UI component |
| `web/src/components/SystemTab.tsx` | Contains BluetoothSection |
| `playbooks/deploy.yml` | Group membership + sudoers |
