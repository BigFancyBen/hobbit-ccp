---
name: controllers
description: Manage Xbox Wireless Adapter controllers on the Hobbit mini PC. Use for troubleshooting controller detection, checking connected controllers, or modifying the controller UI.
---

# Xbox Wireless Adapter Controllers

Controllers connect via an Xbox Wireless Adapter (model 1790) with the xone Linux driver. Pairing is hardware-based (sync buttons). See `docs/controllers.md` for full documentation.

## Architecture

```
Controller → Xbox Wireless Adapter → USB → Hobbit (xone/evdev) → Moonlight → Sunshine → Game
```

- Controller pairs via hardware sync buttons on adapter + controller
- xone kernel driver exposes as `/dev/input/event*`
- Moonlight reads input and sends to Sunshine
- Sunshine emulates Xbox 360 controller

## Required Groups

The `hobbit` user must be in:
- `input` - Access to /dev/input/event*

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/control/controllers` | GET | List connected controllers + pairing state |
| `/api/control/controllers/pair` | POST | Toggle adapter pairing mode (`{ "enabled": true/false }`) |

## Troubleshooting Commands

```bash
# Check xone driver is loaded
lsmod | grep xone

# Check adapter detected
dmesg | grep xone

# List connected controllers
ls /dev/input/by-id/ | grep joystick

# Test API
curl http://hobbit.local/api/control/controllers

# Check bridge logs
ssh hobbit "journalctl -u hobbit-bridge -f"

# Check USB adapter
lsusb | grep Microsoft

# Load driver manually
sudo modprobe xone-dongle
```

## Files

| File | Purpose |
|------|---------|
| `files/bridge.js` | `/controllers` and `/controllers/pair` endpoints |
| `files/xone-pair.sh` | Toggles xone adapter pairing via sysfs |
| `web/src/hooks/useControllers.ts` | React hook (read-only) |
| `web/src/components/SystemTab.tsx` | Controller UI (save slots) |
| `roles/moonlight/tasks/main.yml` | xone driver installation |
| `playbooks/deploy.yml` | User group membership |
| `docs/controllers.md` | Full documentation |

## Previous Bluetooth Setup

Bluetooth code is preserved but disabled. See `.claude/skills/bluetooth.md` and `docs/bluetooth.md` for reference.
