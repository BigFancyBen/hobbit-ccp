# Xbox Wireless Adapter Controller Support

Game controllers connect to the Hobbit mini PC via an Xbox Wireless Adapter (model 1790) and are forwarded through Moonlight to the gaming PC.

## How It Works

```
┌─────────────────┐   Xbox Wireless   ┌─────────────────┐
│  Game Controller │ ───────────────► │  Xbox Wireless  │
│  (Xbox Series)   │   Protocol       │  Adapter (1790) │
└─────────────────┘                   └────────┬────────┘
                                               │ USB
                                               ▼
                                      ┌─────────────────┐
                                      │  Hobbit Mini PC │
                                      │  (xone driver)  │
                                      │  /dev/input/*   │
                                      └────────┬────────┘
                                               │ evdev
                                               ▼
                                      ┌─────────────────┐
                                      │    Moonlight    │
                                      │  (reads input)  │
                                      └────────┬────────┘
                                               │ Network (GameStream)
                                               ▼
                                      ┌─────────────────┐
                                      │    Sunshine     │
                                      │  (Gaming PC)    │
                                      │ Virtual Xbox 360│
                                      └─────────────────┘
```

1. Controller connects wirelessly to the Xbox Wireless Adapter
2. The xone kernel driver exposes it as `/dev/input/event*`
3. Moonlight reads controller input via evdev
4. Moonlight sends input over the network to Sunshine
5. Sunshine emulates an Xbox 360 controller for games

## Dongle Power Management

The Xbox Wireless Adapter USB dongle is **off by default** to save controller battery. It's toggled automatically with gaming sessions:

- **Bridge startup**: dongle disabled (idle state)
- **Game launch** (`/launch-moonlight`): dongle enabled — paired controllers auto-reconnect within ~2s
- **Game exit** (`/exit-gaming` or session ends naturally): dongle disabled — controllers disconnect

This is done via `xone-dongle.sh on|off`, which toggles the USB device's `authorized` sysfs attribute. When deauthorized, the kernel unbinds the xone driver and the adapter stops RF communication. When re-authorized, the driver rebinds and paired controllers reconnect automatically.

## Pairing a Controller

Pairing is a **one-time setup**. Once paired, the controller remembers the adapter and auto-connects whenever the dongle is enabled.

### From the Web UI (rare)

The `/controllers/pair` API endpoint temporarily enables the dongle, enters pairing mode for 30 seconds, then disables the dongle again.

### Hardware-Only

1. Temporarily enable the dongle (e.g., launch a game, or use the API)
2. Press the **sync button** on the Xbox Wireless Adapter (small button on the side)
3. Press the **sync button** on the Xbox controller (top, near LB)
4. Both will flash, then the controller's Xbox button stays lit = paired

## xone Driver

The [xone](https://github.com/medusalix/xone) driver provides Linux support for the Xbox Wireless Adapter. It's installed via DKMS by the Ansible `moonlight` role.

### Installation (automated)

The `roles/moonlight/tasks/main.yml` playbook handles:
- Installing dependencies (`dkms`, `cabextract`, `curl`, `linux-headers-generic`)
- Cloning the xone repository to `/opt/xone`
- Running `./install.sh` (DKMS kernel module)
- Running `./xone-get-firmware.sh` (adapter firmware)

### Requirements

- `hobbit` user must be in the `input` group (for `/dev/input/event*` access)
- This is configured in `playbooks/deploy.yml`

## Bridge API

### GET /controllers

Returns currently connected controllers and pairing state. Controller names are read from sysfs (`/sys/class/input/eventX/device/name`) by resolving the `/dev/input/by-id/` symlink to its event device. Falls back to the cleaned by-id filename if the sysfs read fails.

```json
{
  "controllers": [
    { "name": "Microsoft Xbox Controller" }
  ],
  "pairing": false
}
```

Returns an empty array if no controllers are connected (normal when dongle is off):
```json
{
  "controllers": [],
  "pairing": false
}
```

### POST /controllers/pair

Toggle the adapter's pairing mode. Automatically enables the dongle first (with 1s delay for driver bind), then enters pairing mode via `xone-pair.sh`. Disables the dongle when pairing ends.

**Enable pairing:**
```json
{ "enabled": true }
```
Response: `{ "status": "pairing" }`

Pairing auto-stops after 30 seconds.

**Disable pairing:**
```json
{ "enabled": false }
```
Response: `{ "status": "stopped" }`

## Troubleshooting

### Check xone module is loaded

```bash
lsmod | grep xone
```

If not loaded:
```bash
sudo modprobe xone-dongle
```

### Check adapter is detected

```bash
dmesg | grep xone
```

Look for lines like:
```
xone-dongle: USB dongle detected
```

### Check dongle USB device

```bash
lsusb | grep Microsoft
```

Should show the Xbox Wireless Adapter (vendor 045e, product 02e6 or 02fe).

### Check dongle authorization state

```bash
# Find the dongle's sysfs path
for dev in /sys/bus/usb/devices/[0-9]*; do
  [ -f "$dev/idVendor" ] || continue
  [ "$(cat "$dev/idVendor" 2>/dev/null)" = "045e" ] || continue
  echo "$dev: authorized=$(cat "$dev/authorized" 2>/dev/null)"
done
```

### Manually toggle dongle

```bash
sudo /usr/local/bin/xone-dongle.sh on   # Enable
sudo /usr/local/bin/xone-dongle.sh off  # Disable
```

### Check controller appears as input device

```bash
ls /dev/input/by-id/ | grep joystick
```

### Check bridge logs

```bash
journalctl -u hobbit-bridge -f
```

### Controller not connecting after game launch

1. Check bridge logs for "Xbox dongle turned on" message
2. Verify dongle is authorized (see above)
3. The controller takes ~2s to auto-reconnect after dongle is enabled
4. Try pressing the Xbox button on the controller to wake it

## Files Reference

| File | Purpose |
|------|---------|
| `files/bridge.js` | `/controllers` and `/controllers/pair` API endpoints, dongle toggle on launch/exit |
| `files/xone-dongle.sh` | Toggles dongle USB device via sysfs `authorized` attribute |
| `files/xone-pair.sh` | Toggles xone adapter pairing via sysfs |
| `roles/moonlight/tasks/main.yml` | xone driver installation |
| `playbooks/deploy.yml` | Script deployment, sudoers, user group config |
| `docs/controllers.md` | This documentation |
