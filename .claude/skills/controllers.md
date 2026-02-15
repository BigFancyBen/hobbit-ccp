---
name: controllers
description: Manage Xbox Wireless Adapter controllers on the Hobbit mini PC. Use for troubleshooting controller detection, dongle power management, or modifying the controller/gaming flow.
---

# Xbox Wireless Adapter Controllers

Controllers connect via an Xbox Wireless Adapter (model 1790) with the xone Linux driver. The dongle is off by default and toggled automatically with gaming sessions to save controller battery. Pairing is a one-time hardware setup. See `docs/controllers.md` for full documentation.

## Architecture

```
Controller → Xbox Wireless Adapter → USB → Hobbit (xone/evdev) → Moonlight → Sunshine → Game
```

- Dongle is off by default, enabled on game launch, disabled on exit
- Controller auto-reconnects when dongle is enabled (~2s)
- xone kernel driver exposes as `/dev/input/event*`
- Moonlight reads input and sends to Sunshine
- Sunshine emulates Xbox 360 controller

## Dongle Power Lifecycle

| Event | Dongle | Controller |
|-------|--------|------------|
| Bridge startup | OFF | Disconnected (saves battery) |
| Game launch | ON | Auto-connects ~2s |
| Game exit | OFF | Disconnects |
| Pairing request | ON (temporary) | Enters sync mode |
| Pairing ends | OFF | Disconnects |

## Required Groups

The `hobbit` user must be in:
- `input` - Access to /dev/input/event*

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/control/controllers` | GET | List connected controllers + pairing state |
| `/api/control/controllers/pair` | POST | Toggle adapter pairing mode (`{ "enabled": true/false }`). Enables dongle first, disables after. |

## Troubleshooting Commands

```bash
# Check xone driver is loaded
lsmod | grep xone

# Check adapter detected
dmesg | grep xone

# Check dongle authorization state
for dev in /sys/bus/usb/devices/[0-9]*; do
  [ -f "$dev/idVendor" ] || continue
  [ "$(cat "$dev/idVendor" 2>/dev/null)" = "045e" ] || continue
  echo "$dev: authorized=$(cat "$dev/authorized" 2>/dev/null)"
done

# Manually toggle dongle
sudo /usr/local/bin/xone-dongle.sh on
sudo /usr/local/bin/xone-dongle.sh off

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
| `files/bridge.js` | `/controllers` and `/controllers/pair` endpoints, dongle toggle on launch/exit |
| `files/xone-dongle.sh` | Toggles dongle USB device via sysfs `authorized` attribute |
| `files/xone-pair.sh` | Toggles xone adapter pairing via sysfs |
| `roles/moonlight/tasks/main.yml` | xone driver installation |
| `playbooks/deploy.yml` | Script deployment, sudoers, user group config |
| `docs/controllers.md` | Full documentation |
