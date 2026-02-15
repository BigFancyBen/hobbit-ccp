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

## Pairing a Controller

Pairing can be triggered from the web UI or via hardware buttons:

### From the Web UI

1. Go to **Settings > System**
2. Click **Pair** on the empty controller slot
3. Press the **sync button** on your Xbox controller (top, near LB)
4. The UI shows "Pairing..." for up to 30 seconds
5. Once paired, the controller appears as a connected slot

Click **Stop** to cancel pairing early.

### Hardware-Only

1. Press the **sync button** on the Xbox Wireless Adapter (small button on the side)
2. Press the **sync button** on the Xbox controller
3. Both will flash, then the controller's Xbox button stays lit = connected

Controllers remember their pairing — just press the Xbox button to reconnect.

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

Returns an empty array if no controllers are connected:
```json
{
  "controllers": [],
  "pairing": false
}
```

### POST /controllers/pair

Toggle the adapter's pairing mode via the xone sysfs interface.

**Enable pairing:**
```json
{ "enabled": true }
```
Response: `{ "status": "pairing" }`

Pairing auto-stops after 30 seconds. The bridge runs `xone-pair.sh 1` which writes to `/sys/bus/usb/drivers/xone-dongle/*/pairing`.

**Disable pairing:**
```json
{ "enabled": false }
```
Response: `{ "status": "stopped" }`

## Web UI

Controllers appear as read-only "save slots" in **Settings > System**:
- Connected controllers show with a green "Connected" dot
- An empty slot shows "Sync controller to adapter" with a **Pair** button
- Clicking **Pair** activates adapter pairing mode for 30 seconds
- Clicking **Stop** cancels pairing early

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

### Check controller appears as input device

```bash
ls /dev/input/by-id/ | grep joystick
```

Should show something like:
```
usb-Microsoft_Xbox_One_S_Controller-event-joystick
```

### Test controller input

```bash
# Install evtest if needed
sudo apt install evtest

# List input devices and select the joystick
sudo evtest
```

### Verify via bridge API

```bash
curl http://hobbit.local/api/control/controllers
```

### Check bridge logs

```bash
journalctl -u hobbit-bridge -f
```

### Controller not connecting

1. Ensure the adapter's LED is flashing (sync mode)
2. Hold the controller's sync button until the Xbox button flashes rapidly
3. Try moving closer to the adapter
4. Check `dmesg` for USB/xone errors

### Adapter not detected

```bash
lsusb | grep Microsoft
```

Should show the Xbox Wireless Adapter. If not, try a different USB port.

## Files Reference

| File | Purpose |
|------|---------|
| `files/bridge.js` | `/controllers` and `/controllers/pair` API endpoints |
| `files/xone-pair.sh` | Toggles xone adapter pairing via sysfs |
| `web/src/hooks/useControllers.ts` | React data hook |
| `web/src/components/SystemTab.tsx` | Controller UI (read-only save slots) |
| `roles/moonlight/tasks/main.yml` | xone driver installation |
| `playbooks/deploy.yml` | User group config |
| `docs/controllers.md` | This documentation |
| `.claude/skills/controllers.md` | Claude skill reference |
